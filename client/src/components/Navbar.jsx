import { Home, Network, Search } from "lucide-react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/Logo.png";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
      <div className="bg-background/80 backdrop-blur-md border rounded-full px-6 py-3 shadow-lg">
        <div className="flex items-center gap-4">

          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <img
              src={Logo}
              alt="Graphify Logo"
              className="h-8 w-auto cursor-pointer"
              onClick={() => navigate("/")}
            />
          </div>

          {/* Search + Home */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2 flex-1 px-4 py-2 rounded-full
                            border bg-background/60 focus-within:ring-2 focus-within:ring-primary">
              <Search size = "17" className="text-muted-foreground" />
              <input
                placeholder="Search..."
                className="w-full bg-transparent text-sm focus:outline-none"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate("/")}
            >
              <Home/>
            </Button>
          </div>

        </div>
      </div>
    </nav>
  );
}
