import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function GraphAlgorithmIntroductionCard(prop) {
  const navigte = useNavigate();
  function handleClick() {
    console.log("Navigating to:", prop.link);
    navigte(prop.link);
  }

  return (
    <Card className="hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className={"text-xl text-primary font-serif font-semibold"}>
          <div>
            
            <button onClick={handleClick} className="hover:underline">
              {prop.title}
              <ArrowRight className="inline-block ml-2 h-6 w-6 text-accent hover:bg-primary/30 rounded-md" />
            </button>
            
          </div>
        </CardTitle>

        <CardDescription className={"text-accent"}>
          {prop.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{prop.content}</p>
        <div className="pt-2 border-t border-border">
          <p className=" text-sm  font-semibold">Time: {prop.time}</p>
          <p className=" text-sm  font-semibold">Space: {prop.space}</p>
        </div>
      </CardContent>
    </Card>
  );
}
