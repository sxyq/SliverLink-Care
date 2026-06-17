const QRCode = {
  async toDataURL(value: string) {
    return `data:image/png;base64,${Buffer.from(value).toString('base64')}`;
  },
};

export default QRCode;
