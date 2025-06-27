import { Kafka } from "kafkajs";
import { v4 as uuidv4 } from "uuid";

const kafka = new Kafka({
  clientId: "comment-producer",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer();
const topic = "raw-comments";

const sampleComments = [
  "Fiyatlar biraz pahalı.",
  "Tatlılar mükemmeldi.",
  "Rezervasyon saatine göre oturduk.",
  "Lezzetli ama porsiyonlar küçük.",
  "Kötü bir deneyimdi.",
  "Yemekler 20 dakikada geldi.",
  "Ortam çok güzeldi.",
  "Bir daha gelmem.",
  "Mekanın ışıklandırması loştu.",
  "Garson çok nazikti ve hizmet kaliteliydi.",
  "Beklemek zorunda kaldık, servis yavaştı.",
  "Yemekler sıcaktı ve taze geldi.",
  "Arkadaşlarımızla oturduk, sohbet ettik.",
  "Tavuk pişmemişti, hayal kırıklığı yaşadım.",
  "Manzara nefisti, çok keyif aldık.",
  "Garson siparişleri sırayla getirdi.",
  "Siparişimiz eksik geldi.",
  "Yemekler doyurucuydu ve lezzetliydi.",
  "Tatlı çok şekerliydi, rahatsız etti.",
  "Vale hizmeti vardı.",
  "Kahve harikaydı, mekanın ambiyansı da çok hoş.",
  "Çalışanlar ilgisizdi ve kaba davrandılar.",
  "Rezervasyon yaptırmamıza rağmen yerimiz yoktu.",
  "Fiyat/performans açısından gayet başarılı.",
  "Masamız çok pisti ve geç temizlendi.",
  "Tatlar sıradandı, özel bir şey yoktu.",
  "Tatlıyı denemedik.",
];

function getRandomComment() {
  const text =
    sampleComments[Math.floor(Math.random() * sampleComments.length)];
  return {
    commentId: uuidv4(),
    commentText: text,
    timestamp: new Date().toISOString(),
  };
}

async function produceComments() {
  await producer.connect();
  console.log("Producer connected. Sending comments...");

  while (true) {
    const comment = getRandomComment();

    await producer.send({
      topic,
      messages: [
        {
          key: comment.commentId,
          value: JSON.stringify(comment),
        },
      ],
    });

    console.log("Sent:", comment);

    const delay = Math.floor(Math.random() * 9900) + 100;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

produceComments().catch(console.error);
