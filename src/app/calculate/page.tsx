import CalculatorForm from "@/components/CalculatorForm";

export default function CalculatePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
        <CalculatorForm />
      </div>
    </main>
  );
}
