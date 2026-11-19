import type { Trip } from "../types/domain";

export interface MemberSettlement {
  readonly memberId: string;
  readonly memberName: string;
  readonly paidAmount: bigint;
  readonly burdenAmount: bigint;
  readonly balance: bigint;
}

export interface Transfer {
  readonly fromMemberId: string;
  readonly fromMemberName: string;
  readonly toMemberId: string;
  readonly toMemberName: string;
  readonly amount: bigint;
}

export interface SettlementResult {
  readonly totalExpense: bigint;
  readonly members: readonly MemberSettlement[];
  readonly transfers: readonly Transfer[];
}

interface Fraction {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

interface RoundedBurdenCandidate {
  readonly memberId: string;
  readonly registrationIndex: number;
  readonly floorAmount: bigint;
  readonly remainderNumerator: bigint;
  readonly remainderDenominator: bigint;
}

interface WorkingTransferMember {
  readonly memberId: string;
  readonly memberName: string;
  readonly registrationIndex: number;
  remainingAmount: bigint;
}

const ZERO = BigInt(0);
const ONE = BigInt(1);

export function calculateSettlement(trip: Trip): SettlementResult {
  const paidAmountByMemberId = new Map(
    trip.members.map((member) => [member.id, ZERO]),
  );
  const burdenFractionByMemberId = new Map<string, Fraction>(
    trip.members.map((member) => [
      member.id,
      { numerator: ZERO, denominator: ONE },
    ]),
  );
  let totalExpense = ZERO;

  trip.payments.forEach((payment) => {
    const paymentAmount = BigInt(payment.amountMinor);
    const currentPaidAmount = paidAmountByMemberId.get(payment.payerId) ?? ZERO;
    paidAmountByMemberId.set(
      payment.payerId,
      currentPaidAmount + paymentAmount,
    );
    totalExpense += paymentAmount;

    const paymentShare: Fraction = {
      numerator: paymentAmount,
      denominator: BigInt(payment.splitAmongMemberIds.length),
    };

    payment.splitAmongMemberIds.forEach((memberId) => {
      const currentBurden = burdenFractionByMemberId.get(memberId) ?? {
        numerator: ZERO,
        denominator: ONE,
      };
      burdenFractionByMemberId.set(
        memberId,
        addFractions(currentBurden, paymentShare),
      );
    });
  });

  const roundedCandidates: RoundedBurdenCandidate[] = trip.members.map(
    (member, registrationIndex) => {
      const burden = burdenFractionByMemberId.get(member.id) ?? {
        numerator: ZERO,
        denominator: ONE,
      };

      return {
        memberId: member.id,
        registrationIndex,
        floorAmount: burden.numerator / burden.denominator,
        remainderNumerator: burden.numerator % burden.denominator,
        remainderDenominator: burden.denominator,
      };
    },
  );
  const floorTotal = roundedCandidates.reduce(
    (total, candidate) => total + candidate.floorAmount,
    ZERO,
  );
  const remainingYen = Number(totalExpense - floorTotal);

  roundedCandidates.sort(compareBurdenRemainders);

  const burdenAmountByMemberId = new Map(
    roundedCandidates.map((candidate) => [
      candidate.memberId,
      candidate.floorAmount,
    ]),
  );

  for (let index = 0; index < remainingYen; index += 1) {
    const candidate = roundedCandidates[index];
    burdenAmountByMemberId.set(
      candidate.memberId,
      (burdenAmountByMemberId.get(candidate.memberId) ?? ZERO) + ONE,
    );
  }

  const members: MemberSettlement[] = trip.members.map((member) => {
    const paidAmount = paidAmountByMemberId.get(member.id) ?? ZERO;
    const burdenAmount = burdenAmountByMemberId.get(member.id) ?? ZERO;

    return {
      memberId: member.id,
      memberName: member.name,
      paidAmount,
      burdenAmount,
      balance: paidAmount - burdenAmount,
    };
  });

  return {
    totalExpense,
    members,
    transfers: calculateTransfers(members),
  };
}

function addFractions(left: Fraction, right: Fraction): Fraction {
  const sharedDivisor = greatestCommonDivisor(
    left.denominator,
    right.denominator,
  );
  const leftMultiplier = right.denominator / sharedDivisor;
  const rightMultiplier = left.denominator / sharedDivisor;
  const numerator =
    left.numerator * leftMultiplier + right.numerator * rightMultiplier;
  const denominator = left.denominator * leftMultiplier;
  const reductionDivisor = greatestCommonDivisor(numerator, denominator);

  return {
    numerator: numerator / reductionDivisor,
    denominator: denominator / reductionDivisor,
  };
}

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let currentLeft = left;
  let currentRight = right;

  while (currentRight !== ZERO) {
    const remainder = currentLeft % currentRight;
    currentLeft = currentRight;
    currentRight = remainder;
  }

  return currentLeft;
}

function compareBurdenRemainders(
  left: RoundedBurdenCandidate,
  right: RoundedBurdenCandidate,
): number {
  const leftScaledRemainder =
    left.remainderNumerator * right.remainderDenominator;
  const rightScaledRemainder =
    right.remainderNumerator * left.remainderDenominator;

  if (leftScaledRemainder === rightScaledRemainder) {
    return left.registrationIndex - right.registrationIndex;
  }

  return leftScaledRemainder > rightScaledRemainder ? -1 : 1;
}

function calculateTransfers(
  members: readonly MemberSettlement[],
): readonly Transfer[] {
  const payers: WorkingTransferMember[] = [];
  const receivers: WorkingTransferMember[] = [];

  members.forEach((member, registrationIndex) => {
    if (member.balance < ZERO) {
      payers.push({
        memberId: member.memberId,
        memberName: member.memberName,
        registrationIndex,
        remainingAmount: -member.balance,
      });
    }

    if (member.balance > ZERO) {
      receivers.push({
        memberId: member.memberId,
        memberName: member.memberName,
        registrationIndex,
        remainingAmount: member.balance,
      });
    }
  });

  const transfers: Transfer[] = [];

  while (payers.length > 0 && receivers.length > 0) {
    payers.sort(compareWorkingAmounts);
    receivers.sort(compareWorkingAmounts);

    const payer = payers[0];
    const receiver = receivers[0];
    const amount =
      payer.remainingAmount < receiver.remainingAmount
        ? payer.remainingAmount
        : receiver.remainingAmount;

    transfers.push({
      fromMemberId: payer.memberId,
      fromMemberName: payer.memberName,
      toMemberId: receiver.memberId,
      toMemberName: receiver.memberName,
      amount,
    });

    payer.remainingAmount -= amount;
    receiver.remainingAmount -= amount;

    if (payer.remainingAmount === ZERO) {
      payers.shift();
    }

    if (receiver.remainingAmount === ZERO) {
      receivers.shift();
    }
  }

  return transfers;
}

function compareWorkingAmounts(
  left: WorkingTransferMember,
  right: WorkingTransferMember,
): number {
  if (left.remainingAmount === right.remainingAmount) {
    return left.registrationIndex - right.registrationIndex;
  }

  return left.remainingAmount > right.remainingAmount ? -1 : 1;
}
