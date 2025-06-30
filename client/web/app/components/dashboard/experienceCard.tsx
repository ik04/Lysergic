import { Experience } from "~/types/dashboard";
import { Link } from "@remix-run/react";

export const ExperienceCard = ({ exp }: { exp: any }) => {
  return (
    <Link
      to={`/experience/view?url=${encodeURIComponent(exp.url)}`}
      className="block border-b w-full border-accent border-dashed px-4 py-3 bg-background transition"
    >
      <div className="flex justify-between items-start mb-2 gap-4">
        <h2 className="text-[13px] md:text-lg font-bold font-spacegrotesk text-accent2 leading-tight max-w-[70%]">
          {exp.title}
        </h2>
        <span className="text-[10px] md:text-xs font-bold text-right font-spacegrotesk capitalize text-accent2 whitespace-nowrap">
          posted by{" "}
          {exp.author.length > 10
            ? `${exp.author.slice(0, 10)}...`
            : exp.author}
        </span>
      </div>

      <div className="flex justify-between items-center gap-2">
        <div className="max-w-[70%] truncate">
          <span className="block truncate text-[10px] py-0.5 text-accent rounded-full font-bold font-spacegrotesk uppercase tracking-wide">
            {exp.substance}
          </span>
        </div>

        {exp.rating && (
          <span className="text-[10px] px-2 py-0.5 bg-rating text-black rounded-full font-bold font-spacegrotesk uppercase tracking-wide whitespace-nowrap">
            {exp.rating}
          </span>
        )}
      </div>
    </Link>
  );
};
