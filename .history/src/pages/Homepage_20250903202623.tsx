import React, { useState, useEffect } from "react";
import {
  Shield,
  Coins,
  Users,
  TrendingUp,
  Eye,
  Zap,
  ChevronRight,
  Star,
  CheckCircle,
  Globe,
  Smartphone,
  Heart,
} from "lucide-react";

function Homepage() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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

  const testimonials = [
    {
      text: "Finally, a platform wey dey expose those wey dey chop money for background!",
      author: "Kemi O.",
      location: "Lagos",
    },
    {
      text: "My Ajo group don save pass N2M with this system. Transparent and secure!",
      author: "Chidi A.",
      location: "Abuja",
    },
    {
      text: "The cultural NFTs dey sweet me. We dey celebrate our heritage while building wealth.",
      author: "Aisha M.",
      location: "Kano",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
      {/* Header */}
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

          <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-semibold transition-all hover:scale-105">
            Join Beta
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-yellow-500/10"></div>

        <div
          className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center transform transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
          }`}
        >
          <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            <span>Built for Nigerian Communities</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6">
            <span className="text-green-600">Dey.Play</span> <br />
            <span className="text-2xl sm:text-3xl lg:text-4xl text-gray-700 font-normal">
              We Dey See Your Lies
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Where Nigerian culture meets blockchain transparency. Build wealth
            through Digital Ajo, expose corruption with on-chain accountability,
            and celebrate our heritage with cultural NFTs.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg flex items-center space-x-2">
              <span>Start Your Ajo Journey</span>
              <ChevronRight className="w-5 h-5" />
            </button>
            <button className="bg-white hover:bg-gray-50 text-green-600 px-8 py-4 rounded-full font-semibold text-lg border-2 border-green-600 transition-all hover:scale-105 hover:shadow-lg">
              Explore Transparency
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 hover:bg-white/80 transition-all">
              <div className="text-2xl font-bold text-green-600">₦2.5B+</div>
              <div className="text-sm text-gray-600">Community Savings</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 hover:bg-white/80 transition-all">
              <div className="text-2xl font-bold text-yellow-600">50K+</div>
              <div className="text-sm text-gray-600">Active Members</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 hover:bg-white/80 transition-all">
              <div className="text-2xl font-bold text-blue-600">1,200+</div>
              <div className="text-sm text-gray-600">Ajo Groups</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 hover:bg-white/80 transition-all">
              <div className="text-2xl font-bold text-purple-600">99.9%</div>
              <div className="text-sm text-gray-600">Transparency Score</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-green-600 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-green-600 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
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

      {/* Cultural Heritage Section */}
      <section className="py-24 bg-gradient-to-br from-yellow-50 to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Celebrating Our Heritage
            </h2>
            <p className="text-xl text-gray-600">
              Digital collectibles that honor Nigerian culture while building
              transparency
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Coins className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Sapa Survivor Badges
              </h3>
              <p className="text-gray-600">
                NFTs for consistent Ajo contributors. Turn your financial
                discipline into digital prestige.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 group">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Wazobia Unity Collection
              </h3>
              <p className="text-gray-600">
                Artwork celebrating Igbo, Yoruba, and Hausa culture. Unity in
                diversity, wealth in community.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 group sm:col-span-2 lg:col-span-1">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Cultural Memes
              </h3>
              <p className="text-gray-600">
                "Dey Play", "Problem no dey finish" - Own iconic Nigerian
                expressions as digital collectibles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              On-Chain Vibes, Zero Deceits
            </h2>
            <p className="text-xl text-gray-600">
              How we're revolutionizing Nigerian transparency and wealth
              building
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

      {/* Testimonials Section */}
      <section
        id="community"
        className="py-24 bg-gradient-to-br from-green-900 to-green-800 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              The Community Speaks
            </h2>
            <p className="text-xl text-green-100">
              Real Nigerians, real results, real transparency
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/20 transition-all hover:scale-105"
              >
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-lg mb-4 leading-relaxed">
                  {testimonial.text}
                </p>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-sm font-bold text-white">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-green-200 text-sm">
                      {testimonial.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Build the Future of Nigerian Accountability?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of Nigerians who are done with lies and ready to
            build wealth together.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="bg-white hover:bg-gray-100 text-green-600 px-8 py-4 rounded-full font-semibold text-lg transition-all hover:scale-105 hover:shadow-xl flex items-center space-x-2">
              <span>Join the Movement</span>
              <ChevronRight className="w-5 h-5" />
            </button>
            <button className="bg-transparent hover:bg-white/10 text-white px-8 py-4 rounded-full font-semibold text-lg border-2 border-white transition-all hover:scale-105">
              Learn More
            </button>
          </div>

          <div className="mt-12 text-center">
            <p className="text-green-100 text-lg font-medium">
              "Dey Play, We See Am" | "No Lies, Just Transparency"
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-yellow-500 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Dey.Play</span>
              </div>
              <p className="text-gray-400 leading-relaxed mb-4">
                Revolutionizing Nigerian transparency and community wealth
                building through blockchain technology and cultural celebration.
              </p>
              <p className="text-sm text-gray-500">
                Built with ❤️ for Nigeria | Powered by Hedera Hashgraph
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Digital Ajo
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Transparency Engine
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Cultural NFTs
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Community
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Telegram
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Discord
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    WhatsApp
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 Dey.Play. We dey see everything. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Homepage;
