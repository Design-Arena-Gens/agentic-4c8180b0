import { NextResponse } from "next/server";
import { buildAnswer, sanitizeUniverse, UniverseModel } from "@/lib/universe";

type Body = {
  question?: string;
  universe?: UniverseModel;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const question = body.question ?? "";
    const universe = sanitizeUniverse(body.universe);
    const { answer, matches } = buildAnswer(universe, question);

    return NextResponse.json({
      answer,
      matches
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Impossible de traiter la question. Vérifiez le format du JSON."
      },
      { status: 400 }
    );
  }
}
