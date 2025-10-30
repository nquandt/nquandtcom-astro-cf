export type Summary = {
  id: number;
  title: string;
  statement: string;
};

export const { get: getSummary } = {
  get: () => {
    return {
      id: 1,
      title: "Software Engineer",
  statement: `I build tooling and services that make teams faster, production more reliable, and put experiences in the hands of users. At work, I stick to a value-driven mindset aiming to balance architectural complexity with value-in-hand, through the use of Azure, Kubernetes, .NET, React, Terraform, and many other technologies. I care about maintainability and performance, and I'm driven by solving problems that create measurable value.

  Some accomplishments I'm proud of: reduced category API latency from ~27s to <1s, cut containerized deployments from ~65m to <10m, and standardized observability with OpenTelemetry + New Relic, which improved incident diagnosis and reduced mean time to resolution. I'm collaborative, detail-oriented, and always looking to grow.`};
  }
}
