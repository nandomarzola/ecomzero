import CalculatorForm from "@/components/CalculatorForm";
import Image from "next/image";

export default function Home() {
  return (
    <div className="">
      <main className="flex pt-0 sm:pt-24 flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <CalculatorForm />
      </main>
    </div>
  );
}
