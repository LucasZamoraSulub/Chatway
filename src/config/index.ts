import "dotenv/config";

export const config = {
    PORT: process.env.PORT ?? 3008,
    //Meta
    jwtToken: process.env.JWT_TOKEN,
    numberId: process.env.NUMBER_ID,
    verifyToken: process.env.VERIFY_TOKEN,
    version: "v20.0",
    //OpenAI
    Model: process.env.MODEL,
    ApiKey: process.env.API_KEY,
    //Google Sheets
    spreadsheetId: process.env.SPREADSHEET_ID,
    privateKey: process.env.PRIVATE_KEY,
    clientEmail: process.env.CLIENT_EMAIL,
    //SQL Server
    server: process.env.DB_SERVER,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    dbPort: process.env.DB_PORT,
    //CRM
    crmApiUrl: process.env.CRM_API_URL,
};