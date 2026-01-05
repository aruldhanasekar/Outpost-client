const Header = () => {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Left - Brand */}
        <div className="flex items-center">
          <span className="font-display text-xl font-bold text-black">
            Outpost
          </span>
        </div>

        {/* Right - Empty for now (Google Sign In button removed) */}
        <div></div>
      </div>
    </header>
  );
};

export default Header;