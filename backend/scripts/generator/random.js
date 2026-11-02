const createRandom = (seed = 20261022) => {
  let state = seed >>> 0;

  const random = () => {
    state += 0x6D2B79F5;

    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const integer = (min, max) => {
    return Math.floor(random() * (max - min + 1)) + min;
  };

  const pick = (items) => {
    return items[integer(0, items.length - 1)];
  };

  const dateBetween = (start, end) => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    return new Date(
      integer(startTime, endTime)
    );
  };

  const shuffle = (items) => {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const j = integer(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  };

  return {
    random,
    integer,
    pick,
    dateBetween,
    shuffle,
  };
};

module.exports = { createRandom };