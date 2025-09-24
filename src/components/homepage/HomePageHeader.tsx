import { Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HomePageHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-[#070101] backdrop-blur-md border-b border-primary/20">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <span className=" text-sm lg:text-xl font-bold text-foreground">
            Ajo.Save
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-8">
          <a
            href="#features"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            Features
          </a>
          <a
            href="#community"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            Community
          </a>
          <a
            href="#about"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            About
          </a>
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm lg:text-lg bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-full font-semibold transition-all hover:scale-105 cursor-pointer"
        >
          Join Beta
        </button>
      </nav>
    </header>
  );
};

export default HomePageHeader;
