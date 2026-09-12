export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto pt-6 pb-4 text-center text-sm text-gray-500 border-t border-gray-200">
      <p>&copy; {year} TinkerPump&trade;. All rights reserved.</p>
      <p className="mt-1 hidden md:block">
        Designed &amp; Developed by Hanson &middot;{" "}
        <a
          href="https://github.com/hhs456/psi-helper"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-orange-500 transition-colors"
        >
          GitHub
        </a>
      </p>
      <p className="mt-1 md:hidden">Designed &amp; Developed by Hanson</p>
    </footer>
  );
}
