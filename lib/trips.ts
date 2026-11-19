import type { AppData, Trip } from "../types/domain";

const MINIMUM_MEMBER_COUNT = 2;

export interface CreateTripInput {
  readonly name: string;
  readonly memberNames: readonly string[];
}

export interface CreateTripValidationErrors {
  readonly tripName: string | null;
  readonly memberCount: string | null;
  readonly memberNames: readonly (string | null)[];
}

export type CreateTripResult =
  | { readonly ok: true; readonly trip: Trip }
  | { readonly ok: false; readonly errors: CreateTripValidationErrors };

type CreateId = () => string;

export function validateCreateTripInput(
  input: CreateTripInput,
): CreateTripValidationErrors {
  const normalizedMemberNames = input.memberNames.map((name) => name.trim());
  const memberNameErrors: (string | null)[] = normalizedMemberNames.map(() => null);
  const firstIndexByName = new Map<string, number>();

  normalizedMemberNames.forEach((name, index) => {
    if (name === "") {
      memberNameErrors[index] = "メンバー名を入力してください。";
      return;
    }

    const firstIndex = firstIndexByName.get(name);

    if (firstIndex === undefined) {
      firstIndexByName.set(name, index);
      return;
    }

    const duplicateMessage = "同じ名前のメンバーは登録できません。";
    memberNameErrors[firstIndex] = duplicateMessage;
    memberNameErrors[index] = duplicateMessage;
  });

  const enteredMemberCount = normalizedMemberNames.filter(
    (name) => name !== "",
  ).length;

  return {
    tripName: input.name.trim() === "" ? "旅行名を入力してください。" : null,
    memberCount:
      enteredMemberCount < MINIMUM_MEMBER_COUNT
        ? "メンバーを2人以上入力してください。"
        : null,
    memberNames: memberNameErrors,
  };
}

export function createTrip(
  input: CreateTripInput,
  createId: CreateId = () => crypto.randomUUID(),
): CreateTripResult {
  const errors = validateCreateTripInput(input);
  const hasErrors =
    errors.tripName !== null ||
    errors.memberCount !== null ||
    errors.memberNames.some((error) => error !== null);

  if (hasErrors) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    trip: {
      id: createId(),
      name: input.name.trim(),
      members: input.memberNames.map((name) => ({
        id: createId(),
        name: name.trim(),
      })),
      payments: [],
    },
  };
}

export function addTrip(appData: AppData, trip: Trip): AppData {
  return {
    ...appData,
    trips: [trip, ...appData.trips],
  };
}

export function removeTrip(appData: AppData, tripId: string): AppData {
  return {
    ...appData,
    trips: appData.trips.filter((trip) => trip.id !== tripId),
  };
}

export function removeAllTrips(appData: AppData): AppData {
  return {
    ...appData,
    trips: [],
  };
}

export function findTripById(appData: AppData, tripId: string): Trip | null {
  return appData.trips.find((trip) => trip.id === tripId) ?? null;
}
