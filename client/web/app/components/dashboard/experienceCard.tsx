import { Experience } from "~/types/dashboard";

export const ExperienceCard = ({ exp }: { exp: Experience }) => {
  return (
    <a
      href={exp.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-baseColor rounded-md px-4 py-3 mb-3 bg-background hover:bg-accent/10 transition"
    >
      <div className="flex justify-between text-[10px] text-muted font-sans mb-1">
        <span>{exp.substance}</span>
        <span>{exp.rating}</span>
      </div>

      <div className="flex justify-between items-center gap-4">
        <h2 className="text-[14px] font-bold font-pressstart text-foreground leading-tight">
          {exp.title}
        </h2>
        <span className="text-[10px] font-bold text-right font-silkscreen text-foreground">
          posted by{" "}
          {exp.author.length > 10
            ? `${exp.author.slice(0, 10)}...`
            : exp.author}
        </span>
      </div>
    </a>
  );
};
