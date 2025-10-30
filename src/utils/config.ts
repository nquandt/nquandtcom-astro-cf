const envVariables = process.env;

const prefix = "APP_";

const getConfig = () => {
  const config: Record<string, any> = {};
  for (let [key, member] of Object.entries(envVariables)) {
    if (!key.startsWith(prefix)) {
      continue;
    }

    const variableNames = key.substring(prefix.length).split("__");
    let current: string | number = variableNames[0];
    let parent: any = config;
    for (let i = 1; i < variableNames.length; i++) {
      const next = variableNames[i];
      const nextAsNumber = parseInt(next);

      // console.log(nextAsNumber);
      if (isNaN(nextAsNumber)) {
        parent[current] ||= {};
        parent = parent[current];
        current = next;
        continue;
      }

      parent[current] ||= [];
      parent = parent[current];
      current = nextAsNumber;
    }

    parent[current] = member;
    // console.log({ key, parent, current, member });
  }

  return config;
};

// console.log(getConfig());
//

export const config = getConfig();

console.log(config);
