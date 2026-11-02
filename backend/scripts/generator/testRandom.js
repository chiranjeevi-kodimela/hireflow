const { createRandom } = require("./random");

const random = createRandom(20261022);

console.log("Random number:", random.random());
console.log("Random integer:", random.integer(1, 100));
console.log("Random choice:", random.pick(["HR", "IT", "Finance"]));
console.log(
  "Random date:",
  random.dateBetween("2026-01-01", "2026-12-31")
);