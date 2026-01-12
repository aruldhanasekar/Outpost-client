import { Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import OutpostLogo from "@/assets/OutpostMail_white_no_background.png";

const Footer = () => {
  return (
    <footer className="relative w-full bg-black h-auto min-h-[24rem] md:h-[32rem] flex items-center justify-center px-4 py-20 md:py-0">
      <div className="flex flex-row items-center gap-2 sm:gap-4 md:gap-6 lg:gap-8">
        <img 
          src={OutpostLogo} 
          alt="Outpost Logo" 
          className="h-8 sm:h-12 md:h-28 lg:h-44 w-auto"
        />
        <span className="font-display text-3xl sm:text-5xl md:text-9xl lg:text-[12rem] font-black text-white">
          Outpost
        </span>
      </div>
      
      {/* Bottom bar */}
      <div className="absolute bottom-4 md:bottom-8 left-4 md:left-8 right-4 md:right-8 flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 md:gap-0 text-white/70 text-xs sm:text-sm font-body">
        {/* Copyright - Bottom Left */}
        <span className="order-3 md:order-1">© 2025 Outpost</span>
        
        {/* Links - Center */}
        <div className="flex items-center gap-4 md:gap-6 order-1 md:order-2">
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms of Use</Link>
        </div>
        
        {/* Social Icons - Bottom Right */}
        <div className="flex items-center gap-4 order-2 md:order-3">
          <a
            href="https://www.linkedin.com/company/outpostmail"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            <Linkedin size={18} className="md:w-5 md:h-5" />
          </a>

          <a
            href="https://x.com/Outpostmail_"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-[18px] h-[18px] md:w-5 md:h-5"
              fill="currentColor"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>

      </div>
    </footer>
  );
};

export default Footer;