import { Globe, Smartphone, Users } from "lucide-react";

const HowItWorks = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            On-Chain Vibes, Zero Deceits
          </h2>
          <p className="text-xl text-gray-600">
            How we're revolutionizing Nigerian transparency and wealth building
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="text-center group">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-200 transition-colors">
              <Smartphone className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Mobile-First Experience
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Designed for every Nigerian, from Lagos tech bros to village
              entrepreneurs. Accessible across all economic levels.
            </p>
          </div>

          <div className="text-center group">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-yellow-200 transition-colors">
              <Globe className="w-10 h-10 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Real-World Impact
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Tokenized gold and silver backing ensures your savings have real
              value. No speculative nonsense, just solid wealth building.
            </p>
          </div>

          <div className="text-center group">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-200 transition-colors">
              <Users className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Community Driven
            </h3>
            <p className="text-gray-600 leading-relaxed">
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
