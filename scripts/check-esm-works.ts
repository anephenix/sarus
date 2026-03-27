import Sarus from "../dist/esm/index.js";

const sarus = new Sarus({ url: "ws://localhost:8080" });
sarus.disconnect();
