declare module "qrcode" {
  interface QRCodeColorOptions {
    dark?: string;
    light?: string;
  }

  interface QRCodeOptions {
    margin?: number;
    width?: number;
    color?: QRCodeColorOptions;
  }

  const QRCode: {
    toDataURL(text: string, options?: QRCodeOptions): Promise<string>;
  };

  export default QRCode;
}
