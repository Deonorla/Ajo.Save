import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HomePageHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-yellow-500 rounded-lg flex items-center justify-center">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Dey.Play</span>
        </div>

        <div className="hidden md:flex items-center space-x-8">
          <a
            href="#features"
            className="text-gray-700 hover:text-green-600 transition-colors"
          >
            Features
          </a>
          <a
            href="#community"
            className="text-gray-700 hover:text-green-600 transition-colors"
          >
            Community
          </a>
          <a
            href="#about"
            className="text-gray-700 hover:text-green-600 transition-colors"
          >
            About
          </a>
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-semibold transition-all hover:scale-105"
        >
          Join Beta
        </button>
      </nav>
    </header>
  );
};

export default HomePageHeader;
