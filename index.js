// const token = '6218676689:AAH-bSjgndH3W-Tf3ye-axOrJgBvIbTihgM';
// const token = '5659734996:AAHvVfkBNuz6cGP5wh7DBXOWfMDXXeKqpO4';
const TelegramBot = require('node-telegram-bot-api');
const token = '5659734996:AAHvVfkBNuz6cGP5wh7DBXOWfMDXXeKqpO4'; // Замініть на ваш токен
const adminChatId = 'YOUR_ADMIN_CHAT_ID'; // Замініть на ID чату адміністратора

const bot = new TelegramBot(token, { polling: true });

const clients = new Map();

function getClientData(chatId) {
  if (!clients.has(chatId)) {
    clients.set(chatId, {});
  }
  return clients.get(chatId);
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const clientData = getClientData(chatId);
  clientData.awaitingChat = false;

  const welcomeMessage = "Привіт! Я бот, який допомагає вам у прибиранні приміщень.";

  const menu = 'Виберіть тип об\'єкту для прибирання:';
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Квартира', callback_data: 'flat' }],
        [{ text: 'Офіс', callback_data: 'office' }],
        [{ text: 'Інше приміщення', callback_data: 'other' }],
      ],
    },
  };

  bot.sendMessage(chatId, welcomeMessage)
    .then(() => bot.sendMessage(chatId, menu, options));
});

bot.on('callback_query', (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const clientData = getClientData(chatId);

  const data = callbackQuery.data;

  if (data === 'flat' || data === 'office' || data === 'other') {
    clientData.order = {
      type: data,
      squareMeters: null,
      address: null,
      contactName: null,
      contactPhone: null,
      photoId: null
    };

    const instructions = 'Будь ласка, надішліть фотографію приміщення ( пропустити цей крок, відправивши будь-який текст) та вкажіть квадратуру (тільки цифри):';
    bot.sendMessage(chatId, instructions);
    clientData.awaitingPhotoAndSquareMeters = true;
  } else {
    bot.answerCallbackQuery(callbackQuery.id);
  }
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const clientData = getClientData(chatId);

  const text = msg.text;

  if (clientData.awaitingPhotoAndSquareMeters) {
    clientData.order.photoId = msg.photo ? msg.photo[0].file_id : null;

    const squareMeters = parseInt(text, 10);
    if (isNaN(squareMeters)) {
      bot.sendMessage(chatId, 'Введіть правильну кількість квадратних метрів (тільки цифри):');
    } else {
      clientData.order.squareMeters = squareMeters;

      const addressRequest = 'Будь ласка, надішліть адресу, геолокацію:';
bot.sendMessage(chatId, addressRequest);
clientData.awaitingPhotoAndSquareMeters = false;
clientData.awaitingAddress = true;
} else if (clientData.awaitingAddress) {
  clientData.order.address = msg.location
    ? `${msg.location.latitude}, ${msg.location.longitude}`
    : text;

  const contactNameRequest = 'Будь ласка, введіть ваше ім\'я:';
  bot.sendMessage(chatId, contactNameRequest);
  clientData.awaitingAddress = false;
  clientData.awaitingContactName = true;
} else if (clientData.awaitingContactName) {
  clientData.order.contactName = text;

  const contactPhoneRequest = 'Будь ласка, введіть ваш номер телефону у форматі +380XXXXXXXXX:';
  bot.sendMessage(chatId, contactPhoneRequest);
  clientData.awaitingContactName = false;
  clientData.awaitingContactPhone = true;
} else if (clientData.awaitingContactPhone) {
  if (/^\+380\d{9}$/.test(text)) {
    clientData.order.contactPhone = text;

    const confirmation = 'Дякуємо за замовлення! Наш менеджер зв\'яжеться з вами найближчим часом для уточнення деталей.';
    bot.sendMessage(chatId, confirmation);

    const orderDetails = `Нове замовлення (${chatId}):
Тип об'єкту: ${clientData.order.type}
Квадратура: ${clientData.order.squareMeters} м²
Адреса: ${clientData.order.address}
Ім'я: ${clientData.order.contactName}
Телефон: ${clientData.order.contactPhone}`;
    bot.sendMessage(adminChatId, orderDetails);

    if (clientData.order.photoId) {
      bot.sendPhoto(adminChatId, clientData.order.photoId);
    }

    clientData.awaitingContactPhone = false;
    clients.delete(chatId);
  } else {
    bot.sendMessage(chatId, 'Введіть правильний номер телефону у форматі +380XXXXXXXXX:');
  }
} else if (clientData.awaitingChat) {
  const chatMessage = `Чат від ${chatId}:\n${text}`;
  bot.sendMessage(adminChatId, chatMessage);
} else if (text.toLowerCase() === 'допомога') {
  const help = 'Для початку користування ботом наберіть /start';
  bot.sendMessage(chatId, help);
}
});

