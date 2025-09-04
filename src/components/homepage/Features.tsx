import { CheckCircle, Coins, Shield, TrendingUp, Users } from "lucide-react";
import { useState } from "react";

const Features = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            No Lies, Just Transparency
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Four revolutionary features that transform how Nigerians build
            wealth and hold organizations accountable.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className={`p-6 rounded-xl cursor-pointer transition-all duration-300 ${
                    activeFeature === index
                      ? "bg-green-50 border-2 border-green-500 scale-105"
                      : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                  }`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center`}
                    >
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-green-500 to-yellow-500 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">
                Where Culture Meets Truth
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5" />
                  <span>Tokenized gold & silver backing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5" />
                  <span>On-chain vibes, zero deceits</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5" />
                  <span>Community wealth building</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5" />
                  <span>Cultural NFT celebrations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;

const features = [
  {
    icon: Shield,
    title: "Transparency Engine",
    description:
      "Make NGOs and organizations accountable. Every naira tracked on-chain.",
    color: "bg-green-500",
  },
  {
    icon: Coins,
    title: "Digital Ajo System",
    description:
      "Revolutionary savings groups with tokenized gold and silver backing.",
    color: "bg-yellow-500",
  },
  {
    icon: Users,
    title: "Community Culture",
    description:
      "Celebrate Nigerian heritage with cultural NFTs and social features.",
    color: "bg-blue-500",
  },
  {
    icon: TrendingUp,
    title: "Wealth Building",
    description:
      "No idle capital. Your money works while building community trust.",
    color: "bg-purple-500",
  },
];
