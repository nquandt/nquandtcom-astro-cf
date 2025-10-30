export type Experience = {
  id: number;
  title: string;
  company: string;
  start: string;
  end?: string;
  location: string;
  details: string;
  overview?: string;
};

export const { get: getExperience, getAll: getExperiences } = {
  get: (id: number): Experience | undefined => {
    return getExperiences().find(exp => exp.id === id);
  },
  getAll: (): Experience[] => {
    return [
      {
  id: 1,
  title: "Staff Software Engineer",
  company: "Milwaukee Tool",
  start: "2023-12-01",
  end: undefined,
  location: "Milwaukee, WI (Remote)",
  overview: "Own platform architecture and shared developer tooling for public-facing web and API teams to improve reliability, consistency, and developer velocity.",
  details: `- Built a multi-region BFF/API Gateway with [.NET](https://dotnet.microsoft.com/), [YARP](https://microsoft.github.io/reverse-proxy/), and [Azure Front Door](https://azure.microsoft.com/products/frontdoor), replacing disparate NGINX instances and centralizing routing in [Azure App Configuration](https://azure.microsoft.com/services/app-configuration/). Result: fewer outages (from ~3×10min/month to ~1×2min/month), regional failover, and support for zero‑downtime A/B tests.
- Piloted and scaled a shared [React](https://react.dev/) design system ( [Tailwind CSS](https://tailwindcss.com/) + [Storybook](https://storybook.js.org/) ) now used by 4 products to enforce brand consistency and reduce duplicated components; design review moved earlier in the process as a result.
- Built an internal [ASP.NET Core](https://dotnet.microsoft.com/apps/aspnet) service framework (internal NuGet) that wraps the [IHostApplicationBuilder](https://learn.microsoft.com/aspnet/core/fundamentals/host/generic-host) to provide startup validation, sensible defaults for health checks, service discovery, and troubleshooting helpers.
- Led migration to centralized configuration and secrets (Azure App Configuration + [Azure Key Vault](https://azure.microsoft.com/products/key-vault/)), consolidating routing and reducing config-related runtime errors.
- Integrated [Statsig](https://statsig.com/) for feature flags and experimentation: feature flags for engineering rollouts and A/B tests for UX experiments, with an internal-first rollout pattern.
- Spearheaded a production GPT-4-turbo assistant using [Semantic Kernel](https://github.com/microsoft/semantic-kernel) to help sales reps at retailers; field users report a 63% happiness rating via in-app feedback.
- Standardized observability with [OpenTelemetry](https://opentelemetry.io/) + [New Relic](https://newrelic.com/) (logged via [ILogger](https://learn.microsoft.com/dotnet/core/extensions/logging)), giving consistent traces and logs across front-end and backend services and improving incident diagnosis.`
      },
      {
        id: 2,
  title: "Senior Software Engineer",
  company: "Milwaukee Tool",
  start: "2022-08-01",
  end: "2023-11-30",
  location: "Milwaukee, WI (Remote)",
  overview: "Rebuilt our frontend into an SSR React app and re-architected product data delivery so category pages and listing APIs became fast and predictable.",
  details: `- Migrated the frontend from .NET MVC to [React](https://react.dev/) SSR with [Next.js](https://nextjs.org/), consolidating views and simplifying the UI surface for faster iterations.
- Rebuilt the product-data strategy (category indexing + client caching at the time) and reduced category API response times from ~27s (and page loads as high as ~55s for some listing pages) to under 1 second for category queries, even when returning 2,000+ products.
- Architected a dedicated product-data microservice with pub/sub distribution using [Azure Service Bus](https://azure.microsoft.com/services/service-bus/), which fed downstream consumers and helped shrink client-facing listing latency (up to ~7-20x on affected pages).
- Introduced [Terraform](https://www.terraform.io/) and IaC patterns, authoring core modules and moving deployments from manual steps to code, improving reproducibility and discoverability of infra settings across envs.
- Restructured parts of the monolith into vertical microservices and CI/CD pipelines, which cut build/deploy times (some teams went from ~75 minutes to under 8 minutes) and enabled parallel workstreams.
- Standardized deployments with Azure DevOps Pipelines, Azure Container Registry, and [AKS](https://azure.microsoft.com/products/kubernetes-service), and instrumented services with [OpenTelemetry](https://opentelemetry.io/) + [New Relic](https://newrelic.com/) for consistent telemetry.
- Mentored peers, led monthly knowledge-sharing sessions, and partnered with InfoSec to introduce static analysis and traffic monitoring where needed.`
      },
      {
        id: 3,
  title: "Software Engineer II",
  company: "Milwaukee Tool",
  start: "2022-04-01",
  end: "2022-07-31",
  location: "Milwaukee, WI (Remote)",
  overview: "Published a small internal NuGet for startup validation, owned AKS reproducibility, and extracted a product domain from our Sitecore monolith so a small team could deploy independently.",
  details: `- Published an internal NuGet package to our Azure DevOps artifact feed implementing an [IOptions](https://learn.microsoft.com/aspnet/core/fundamentals/configuration/options) validation pattern. The package validated final IOptions bindings (presence of keys, connection strings, loaded secrets) and emitted standard startup messages that flagged which bindings failed.
- The validation approach reduced troubleshooting for cloud deployments: apps failed to start instead of becoming "ready" with bad state, which let NGINX/AKS avoid routing traffic to unhealthy pods and gave teams a chance to fix configuration before going live.
- Owned AKS deployments and authored [Helm](https://helm.sh/) charts to replace manual deployments, improving reproducibility between stage and prod and making environment differences easier to understand.
- Planned, deployed, and maintained a [Sitecore](https://www.sitecore.com/) 10 XM platform in [AKS](https://azure.microsoft.com/products/kubernetes-service) using Azure DevOps CI/CD pipelines and private Azure Container Registry images.
- Provisioned [Ingress-NGINX](https://kubernetes.github.io/ingress-nginx/) to manage load balancing and routing.
- Broke out the "Packout Builder" product from the Sitecore monolith into a standalone React app deployed to a Node.js pod on AKS so the three-person product team could own deployments and release on their own cycle (this was a discretionary solution that remained in use 3+ years).`
      },
      {
        id: 4,
  title: "Software Engineer",
  company: "Milwaukee Tool",
  start: "2021-08-01",
  end: "2022-03-31",
  location: "Milwaukee, WI (Remote)",
  overview: "Grew into the Sitecore-on-AKS subject-matter expert; rebuilt pipelines, improved deploy times, and shipped a high-traffic product comparison tool.",
  details: `- Rebuilt Sitecore deployment pipelines and the front-end Gulp workflow; cut a full 10GB Docker deployment from ~65 minutes to <10 minutes.
- Designed and shipped the customer-facing product comparison tool (/products/power-tools/drilling/compare) using Svelte + Solr — ~6,000 visits/day at launch with a peak of 11,000/day (now ~1,200/day).
- Implemented Kubernetes health patterns (startup/readiness/liveness) using .NET HealthChecks and exposed /healthz endpoints to validate DB connectivity and configuration; enabled NGINX to route traffic away from unhealthy pods.
- Deployed and tuned Sitecore 10 on AKS using Helm and Ingress-NGINX, focusing on scaling and runtime reliability.
- Built and maintained an asset pipeline (Gulp + Rollup) to support React and Svelte front-ends and speed developer feedback loops.
- Started as a contributor and rapidly ramped into a SME for pipelines and runtime reliability, owning deployments and troubleshooting for the platform.`
      },
      {
        id: 5,
  title: "Sales Analyst",
  company: "Builders World Wholesale Distribution",
  start: "2019-01-01",
  end: "2021-07-31",
  location: "Pewaukee, WI (Hybrid)",
  overview: "Supported a finance-led migration to Acumatica and built reporting automation that cut daily Excel work and made marketplace pricing safer and easier to manage.",
  details: `- Supported migration of 10,000+ product records into Acumatica, centralizing product data used for exports and integrations with Walmart, Amazon, eBay, and the company website.
- Built and maintained daily cron jobs (run at 6:00 AM CST) that produced pricing charts and competitor-aware, margin-sensitive price recommendations; these reports were used to update a few hundred SKUs each day and saved my manager ~4 hours/day of manual Excel work.
- Created export workflows and a .NET WinForms tool (Excel interop + marketplace APIs) to publish price updates to Amazon/Walmart; enforced a 4% minimum-margin rule so non-technical users couldn’t push prices that would lose money.
- Produced order-sheet exports that reduced time spent merging different reports and made it simpler for distribution staff to act on inventory needs.
- Trained and handed off tools and reports to clerical staff and one other analyst; primary stakeholder was the Director of Finance.`
      }
    ];
  }
};