import { ChevronRight, Eye } from "lucide-react";

const Footer = () => {
  return (
    <>
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
    </>
  );
};

export default Footer;
