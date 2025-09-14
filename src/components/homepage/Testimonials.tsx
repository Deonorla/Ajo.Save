import { Star } from "lucide-react";

const Testimonials = () => {
  return (
    <section
      id="community"
      className="py-24  relative"
      style={{ backgroundColor: "#070101" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            The Community Speaks
          </h2>
          <p className="text-xl text-muted-foreground">
            Real Nigerians, real results, real transparency
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card/80 backdrop-blur-sm rounded-xl p-6 hover:bg-card transition-all hover:scale-105 border border-border"
            >
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-accent fill-current" />
                ))}
              </div>
              <p className="text-lg mb-4 leading-relaxed text-foreground">
                {testimonial.text}
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-sm font-bold text-white">
                  {testimonial.author.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {testimonial.author}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {testimonial.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

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
