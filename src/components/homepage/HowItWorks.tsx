import { Globe, Smartphone, Users } from "lucide-react";

const HowItWorks = () => {
  return (
    <section className="py-24 bg-[#070101]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            On-Chain Vibes, Zero Deceits
          </h2>
          <p className="text-xl text-muted-foreground">
            How we're revolutionizing Nigerian transparency and wealth building
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="text-center group">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/30 transition-colors border border-primary/30">
              <Smartphone className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Mobile-First Experience
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Designed for every Nigerian, from Lagos tech bros to village
              entrepreneurs. Accessible across all economic levels.
            </p>
          </div>

          <div className="text-center group">
            <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-accent/30 transition-colors border border-accent/30">
              <Globe className="w-10 h-10 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Real-World Impact
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Tokenized gold and silver backing ensures your savings have real
              value. No speculative nonsense, just solid wealth building.
            </p>
          </div>

          <div className="text-center group">
            <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-500/30 transition-colors border border-purple-500/30">
              <Users className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Community Driven
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Every vote is a Nigerian saying "I see through your lies."
              Community accountability powered by blockchain transparency.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
