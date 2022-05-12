export function parseRaw(raw, dataPoint) {
  const attrs = dataPoint.entities[0].attrs;
  const parsedData = {};

  const data = raw.slice(10);

  attrs.forEach((attr) => {
    let value;
    const byteOffset = attr.position.byte_offset;
    const bitOffset = attr.position.bit_offset;
    const len = attr.position.len;

    const d = data.slice(byteOffset, byteOffset + (attr.position.unit === 'byte' ? len : 1))
    const bitMask = [0b1, 0b11, 0b111, 0b1111, 0b11111, 0b111111, 0b1111111, 0b11111111]
    value = attr.position.unit === 'byte' ? d : ((d[0] >> bitOffset) & (bitMask[len - 1]));

    switch (attr.data_type) {
      case 'bool':
        value = !!value;
        break;

      case 'enum':
        value = attr.enum[value];
        break;

      case 'uint8':
        value = value[0];
        break;

      case 'binary':
        break;

      default:
        break;
    }

    parsedData[attr.name] = value
  });
  return parsedData;
}