export default function Footer() {
    return (
      <footer className="w-full h-24 bg-[#7b1f24] flex items-center justify-center relative shadow-inner-footer">
        <p className="text-white text-sm">
          &copy; {new Date().getFullYear()} ECOMZERO. Todos os direitos reservados.
        </p>
      </footer>
    );
  }
  