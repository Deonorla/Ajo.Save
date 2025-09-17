import { ChevronRight, Zap } from "lucide-react";
import { use, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#070101]">
      <div className="absolute inset-0 opacity-30">
        <img
          src="/images/homepage/african-pattern.svg"
          alt="African pattern"
          className="object-cover  "
        />
      </div>

      <div className="absolute bottom-0 right-0 opacity-50">
        <img
          src="/images/homepage/coins-illustration.png"
          alt="Coins illustration"
          className="animate-pulse w-90 h-90"
        />
      </div>

      <div className="absolute bottom-[-10rem] left-[-4rem] opacity-30">
        <img src="/images/homepage/ajo-logo.png" alt="Ajo logo" className="" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10"></div>

      <div
        className={`max-w-4xl mx-auto px-4 mt-6 sm:mt-0 sm:px-6 lg:px-8 text-center transform transition-all duration-1000 ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        }`}
      >
        <div className="inline-flex text-xs sm:text-sm  items-center space-x-2 bg-primary/20 text-primary px-4 py-2 rounded-full  font-medium mb-8 border border-primary/30">
          <Zap className="w-4 h-4" />
          <span>Powered by Hedera </span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-6">
          <span className="text-primary">Ajo.Save</span> <br />
          <span className="text-sm sm:text-xl lg:text-42l text-muted-foreground font-normal">
            Nigeria’s Trusted Savings Culture, Now On-Chain
          </span>
        </h1>

        <p className="text-sm sm:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          From street corners to smart contracts: Build wealth, protect your
          community savings, and keep everyone accountable with Hedera’s fast,
          low-cost blockchain.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full font-semibold text-sm sm:text-lg transition-all hover:scale-105 hover:shadow-lg flex items-center space-x-2"
          >
            <span>Start Your Ajo Journey</span>
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-card hover:bg-card/80 text-foreground px-8 py-4 rounded-full font-semibold text-sm sm:text-lg border-2 border-primary transition-all hover:scale-105 hover:shadow-lg"
          >
            Explore Transparency
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div className="bg-card/60 backdrop-blur-sm rounded-lg p-4 hover:bg-card/80 transition-all border border-border">
            <div className="text-2xl font-bold text-primary">₦2.5B+</div>
            <div className="text-sm text-muted-foreground">
              Community Savings
            </div>
          </div>
          <div className="bg-card/60 backdrop-blur-sm rounded-lg p-4 hover:bg-card/80 transition-all border border-border">
            <div className="text-2xl font-bold text-accent">50K+</div>
            <div className="text-sm text-muted-foreground">Active Members</div>
          </div>
          <div className="bg-card/60 backdrop-blur-sm rounded-lg p-4 hover:bg-card/80 transition-all border border-border">
            <div className="text-2xl font-bold text-blue-400">1,200+</div>
            <div className="text-sm text-muted-foreground">Ajo Groups</div>
          </div>
          <div className="bg-card/60 backdrop-blur-sm rounded-lg p-4 hover:bg-card/80 transition-all border border-border">
            <div className="text-2xl font-bold text-purple-400">99.9%</div>
            <div className="text-sm text-muted-foreground">
              Transparency Score
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-4 h-8 lg:w-6 lg:h-10 border-2 border-primary rounded-full flex justify-center">
          <div className="w-1 h-3 bg-primary rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
