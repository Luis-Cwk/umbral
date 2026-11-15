import { createQr } from "../lib/pey";

async function main(): Promise<void> {
  try {
    const qr = await createQr({
      amount: 0.01,
      concept: "Prueba Umbral 0.01",
      expiration: 600,
      // pey: numRef must be up to 7 digits
      numRef: String(Date.now()).slice(-7),
      generateImage: true,
    });

    console.log(`id: ${qr.id}`);
    console.log(`qrString: ${qr.qrString}`);
    console.log(`qrImage: ${qr.qrImage ? "present" : "absent"}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

void main();
