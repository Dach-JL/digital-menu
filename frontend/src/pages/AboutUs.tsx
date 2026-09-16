import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Phone, Mail, Award, Clock, ShieldCheck, Heart } from 'lucide-react';
import { BottomNavigation } from '@/components/BottomNavigation';

const AboutUs = () => {
  const navigate = useNavigate();

  const achievements = [
    { icon: <Award className="w-5 h-5" />, title: "Best Luxury Hotel", year: "2024" },
    { icon: <ShieldCheck className="w-5 h-5" />, title: "Certified Excellence", year: "2023" },
    { icon: <Heart className="w-5 h-5" />, title: "Guest Choice Award", year: "2022" },
  ];

  return (
    <div className="bg-background flex max-w-[480px] md:max-w-full w-full flex-col overflow-x-hidden mx-auto min-h-screen pb-24 page-transition">
      {/* Sticky Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-6 left-5 z-50 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-lg active:scale-95 transition-transform"
        aria-label="Go back"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Hero Section */}
      <div className="relative w-full h-[320px] overflow-hidden">
        <img
          src="/hotel-lobby.png"
          alt="Royal Hotel Lobby"
          className="w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-10 left-6 right-6">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Royal Hotel</h1>
          <p className="text-white/80 text-sm font-medium flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            Addis Ababa, Ethiopia
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 -mt-6 relative z-10 bg-background rounded-t-[2.5rem] pt-8">
        <div className="md:grid md:grid-cols-2 md:gap-8 md:items-start">
          
          {/* Left Column: Our Story & Achievements */}
          <div className="space-y-8">
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h2 className="text-xl font-bold text-foreground mb-3">Our Story</h2>
              <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                Founded with a vision to redefine hospitality in East Africa, Royal Hotel has been a beacon of luxury and comfort since 1998. 
                We blend traditional Ethiopian warmth with modern architectural excellence to provide an unforgettable sanctuary for both 
                business and leisure travelers.
              </p>
            </section>

            {/* Stats/Achievements */}
            <div className="grid grid-cols-3 gap-3">
              {achievements.map((item, i) => (
                <div key={i} className="bg-card/50 border border-border/50 p-4 rounded-2xl text-center flex flex-col items-center justify-center animate-in zoom-in duration-500 delay-150">
                  <div className="text-zinc-900 dark:text-white mb-2">{item.icon}</div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{item.title}</p>
                  <p className="text-xs font-black text-zinc-900 dark:text-white">{item.year}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Mission & Contact Info */}
          <div className="space-y-8 mt-8 md:mt-0">
            {/* Mission & Vision */}
            <section className="grid grid-cols-1 gap-4">
              <div className="p-5 rounded-3xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xl">
                 <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-zinc-950/5 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-6 h-6" />
                 </div>
                 <h3 className="text-lg font-bold mb-2">Our Mission</h3>
                 <p className="text-sm opacity-80 font-medium leading-relaxed">
                   To deliver a personalized, seamless, and luxurious experience that exceeds every guest's expectation through innovation and unparalleled service.
                 </p>
              </div>
            </section>

            {/* Contact Info */}
            <section className="pb-8">
               <h2 className="text-xl font-bold text-foreground mb-4">Get In Touch</h2>
               <div className="space-y-3">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest leading-none mb-1">Reception</p>
                      <p className="text-sm font-bold">+251 112 345 678</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest leading-none mb-1">Email</p>
                      <p className="text-sm font-bold">contact@royalhotel.com</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest leading-none mb-1">Check-in / Check-out</p>
                      <p className="text-sm font-bold">2:00 PM / 12:00 PM</p>
                    </div>
                  </div>
               </div>
            </section>
          </div>

        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default AboutUs;
