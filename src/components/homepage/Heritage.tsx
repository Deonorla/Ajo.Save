import { Coins, Heart, Star } from "lucide-react";

const Heritage = () => {
  return (
    <section className="py-24 bg-[#070101] relative">
      <div className="absolute inset-0 opacity-20">
        <img
          src="/images/natives.svg"
          alt="Natives"
          className="object-cover "
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Celebrating Our Heritage
          </h2>
          <p className="text-xl text-muted-foreground">
            Digital collectibles that honor Nigerian culture while building
            transparency
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 group border border-border">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Coins className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Sapa Survivor Badges
            </h3>
            <p className="text-muted-foreground">
              NFTs for consistent Ajo contributors. Turn your financial
              discipline into digital prestige.
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 group border border-border">
            <div className="w-16 h-16 bg-gradient-to-br from-accent to-orange-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Wazobia Unity Collection
            </h3>
            <p className="text-muted-foreground">
              Artwork celebrating Igbo, Yoruba, and Hausa culture. Unity in
              diversity, wealth in community.
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 group sm:col-span-2 lg:col-span-1 border border-border">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Cultural Memes
            </h3>
            <p className="text-muted-foreground">
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
