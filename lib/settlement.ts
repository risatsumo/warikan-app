import { getCurrencyFractionDigits } from "./currencies.ts";
import { exchangeRateToFraction } from "./exchange-rates.ts";
import type { CurrencyCode, Payment, Trip } from "../types/domain";

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
  readonly currency: CurrencyCode;
  readonly totalExpense: bigint;
  readonly members: readonly MemberSettlement[];
  readonly transfers: readonly Transfer[];
}

export type SettlementCalculationResult =
  | { readonly ok: true; readonly settlement: SettlementResult }
  | {
      readonly ok: false;
      readonly code: "missing-exchange-rate" | "invalid-settlement-currency";
      readonly error: string;
    };

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

export function calculateSettlement(
  trip: Trip,
  settlementCurrency: CurrencyCode = trip.settlementCurrency,
): SettlementCalculationResult {
  if (
    settlementCurrency !== "JPY" &&
    settlementCurrency !== trip.localCurrency
  ) {
    return {
      ok: false,
      code: "invalid-settlement-currency",
      error: "この旅行で使えない精算通貨です。",
    };
  }

  const paidFractionByMemberId = new Map<string, Fraction>(
    trip.members.map((member) => [
      member.id,
      { numerator: ZERO, denominator: ONE },
    ]),
  );
  const burdenFractionByMemberId = new Map<string, Fraction>(
    trip.members.map((member) => [
      member.id,
      { numerator: ZERO, denominator: ONE },
    ]),
  );
  let totalExpenseFraction: Fraction = {
    numerator: ZERO,
    denominator: ONE,
  };

  for (const payment of trip.payments) {
    const convertedPayment = convertPaymentAmount(
      payment,
      settlementCurrency,
      trip,
    );

    if (convertedPayment === null) {
      return {
        ok: false,
        code: "missing-exchange-rate",
        error: `JPYと${trip.localCurrency}を換算する為替レートを設定してください。`,
      };
    }

    const currentPaidAmount = paidFractionByMemberId.get(payment.payerId) ?? {
      numerator: ZERO,
      denominator: ONE,
    };
    paidFractionByMemberId.set(
      payment.payerId,
      addFractions(currentPaidAmount, convertedPayment),
    );
    totalExpenseFraction = addFractions(
      totalExpenseFraction,
      convertedPayment,
    );

    const paymentShare: Fraction = {
      numerator: convertedPayment.numerator,
      denominator:
        convertedPayment.denominator *
        BigInt(payment.splitAmongMemberIds.length),
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
  }

  const totalExpense = roundFractionHalfUp(totalExpenseFraction);
  const paidAmountByMemberId = roundMemberFractions(
    trip,
    paidFractionByMemberId,
    totalExpense,
  );
  const burdenAmountByMemberId = roundMemberFractions(
    trip,
    burdenFractionByMemberId,
    totalExpense,
  );

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
    ok: true,
    settlement: {
      currency: settlementCurrency,
      totalExpense,
      members,
      transfers: calculateTransfers(members),
    },
  };
}

function roundMemberFractions(
  trip: Trip,
  amountByMemberId: ReadonlyMap<string, Fraction>,
  targetTotal: bigint,
): Map<string, bigint> {

  const roundedCandidates: RoundedBurdenCandidate[] = trip.members.map(
    (member, registrationIndex) => {
      const burden = amountByMemberId.get(member.id) ?? {
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
  const remainingUnits = Number(targetTotal - floorTotal);

  roundedCandidates.sort(compareBurdenRemainders);

  const roundedAmountByMemberId = new Map(
    roundedCandidates.map((candidate) => [
      candidate.memberId,
      candidate.floorAmount,
    ]),
  );

  for (let index = 0; index < remainingUnits; index += 1) {
    const candidate = roundedCandidates[index];
    roundedAmountByMemberId.set(
      candidate.memberId,
      (roundedAmountByMemberId.get(candidate.memberId) ?? ZERO) + ONE,
    );
  }

  return roundedAmountByMemberId;
}

function convertPaymentAmount(
  payment: Payment,
  settlementCurrency: CurrencyCode,
  trip: Trip,
): Fraction | null {
  const paymentAmount = BigInt(payment.amountMinor);

  if (payment.currency === settlementCurrency) {
    return { numerator: paymentAmount, denominator: ONE };
  }

  if (trip.exchangeRate === null) {
    return null;
  }

  const rate = exchangeRateToFraction(
    trip.exchangeRate.jpyPerLocalCurrency,
  );

  if (rate === null) {
    return null;
  }

  const localMinorUnitFactor = BigInt(
    10 ** getCurrencyFractionDigits(trip.localCurrency),
  );

  if (payment.currency === trip.localCurrency && settlementCurrency === "JPY") {
    return reduceFraction({
      numerator: paymentAmount * rate.numerator,
      denominator: localMinorUnitFactor * rate.denominator,
    });
  }

  if (payment.currency === "JPY" && settlementCurrency === trip.localCurrency) {
    return reduceFraction({
      numerator: paymentAmount * localMinorUnitFactor * rate.denominator,
      denominator: rate.numerator,
    });
  }

  return null;
}

function roundFractionHalfUp(value: Fraction): bigint {
  const floorAmount = value.numerator / value.denominator;
  const remainder = value.numerator % value.denominator;

  return remainder * BigInt(2) >= value.denominator
    ? floorAmount + ONE
    : floorAmount;
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

function reduceFraction(value: Fraction): Fraction {
  const reductionDivisor = greatestCommonDivisor(
    value.numerator,
    value.denominator,
  );

  return {
    numerator: value.numerator / reductionDivisor,
    denominator: value.denominator / reductionDivisor,
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
