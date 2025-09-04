import { Coins, Heart, Star } from "lucide-react";

const Heritage = () => {
  return (
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
  );
};

export default Heritage;
