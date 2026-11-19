import type { Metadata } from "next";

import { TripDetailScreen } from "@/components/trips/trip-detail-screen";

export const metadata: Metadata = {
  title: "旅行詳細 | 旅の割り勘",
};

interface TripPageProps {
  readonly params: Promise<{ readonly tripId: string }>;
}

export default async function TripPage({ params }: TripPageProps) {
  const { tripId } = await params;

  return <TripDetailScreen tripId={tripId} />;
}
