import { Star } from "lucide-react";

const Testimonials = () => {
  return (
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
              <p className="text-lg mb-4 leading-relaxed">{testimonial.text}</p>
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
