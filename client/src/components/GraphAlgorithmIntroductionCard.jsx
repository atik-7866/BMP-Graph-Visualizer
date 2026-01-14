import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GraphAlgorithmIntroductionCard(prop) {
  return (
    <Card className="hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className={"text-xl text-primary font-serif font-semibold"}>
          {prop.title}
        </CardTitle>
        <CardDescription className={"text-accent"}>{prop.description}</CardDescription>
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
