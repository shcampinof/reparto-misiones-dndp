import { createDemoSeed } from "./seeds.js";

export class DemoRepository {
  snapshot() {
    throw new Error("DemoRepository.snapshot debe implementarse");
  }

  transaction(_work) {
    throw new Error("DemoRepository.transaction debe implementarse");
  }

  reset() {
    throw new Error("DemoRepository.reset debe implementarse");
  }
}

export class InMemoryDemoRepository extends DemoRepository {
  #state;

  constructor(seedFactory = createDemoSeed) {
    super();
    this.seedFactory = seedFactory;
    this.reset();
  }

  snapshot() {
    return structuredClone(this.#state);
  }

  transaction(work) {
    const draft = structuredClone(this.#state);
    const result = work(draft);
    this.#state = draft;
    return structuredClone(result);
  }

  reset() {
    this.#state = structuredClone(this.seedFactory());
    return this.snapshot();
  }
}
