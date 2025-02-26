require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3000;

app.use(express.static('public'))

// Rota para capturar os leads
app.post("/lead", async (req, res) => {
    const { nome, email } = req.body;
    
    console.log("Recebido lead:", { nome, email });
    
    if (!nome || !email) {
        return res.status(400).json({ error: "Nome e email são obrigatórios!" });
    }
    
    // Validação de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Email inválido!" });
    }
    
    try {
        console.log("Verificando se email já existe...");
        
        // Primeiro, tentar recuperar o API_KEY do ambiente
        const API_KEY = process.env.API_KEY_BREVO;
        
        if (!API_KEY) {
            console.error("API_KEY_BREVO não está definida no arquivo .env");
            return res.status(500).json({ error: "Erro de configuração do servidor" });
        }
        
        console.log("API_KEY disponível:", API_KEY.substring(0, 3) + "..." + API_KEY.substring(API_KEY.length - 3));
        
        // Cadastrar diretamente, lidando com o erro de email duplicado no catch
        try {
            console.log("Tentando cadastrar novo contato...");
            
            const response = await axios.post(
                "https://api.brevo.com/v3/contacts",
                {
                    email: email,
                    attributes: {
                        FIRSTNAME: nome,
                    },
                    listIds: [3], // ID da lista no Brevo
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "api-key": API_KEY,
                    },
                }
            );
            
            console.log("Resposta da API:", response.status, response.statusText);
            console.log("Contato cadastrado com sucesso!");
            
            return res.json({ success: true, message: "Lead cadastrado com sucesso!" });
        } catch (createError) {
            console.error("Erro detalhado ao criar contato:", JSON.stringify(createError.response?.data || createError.message));
            
            // Verificar se o erro é devido ao email já existir
            if (createError.response?.data?.code === "duplicate_parameter") {
                console.log("Email já existe, retornando mensagem ao cliente");
                return res.status(200).json({ success: false, message: "Email já registrado!" });
            } else {
                // Outro erro na criação do contato
                throw createError;
            }
        }
    } catch (error) {
        console.error("Erro completo ao processar lead:", error);
        console.error("Resposta da API em erro:", error.response?.data);
        
        // Fornece uma mensagem de erro mais informativa
        const errorMessage = error.response?.data?.message || error.message || "Erro desconhecido";
        
        res.status(500).json({ 
            error: "Erro ao cadastrar o lead", 
            details: errorMessage,
            code: error.response?.data?.code 
        });
    }
});

// Rota de teste simples para verificar se o servidor está funcionando
app.get("/test", (req, res) => {
    res.json({ message: "Servidor está funcionando!" });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Teste o servidor com: http://localhost:${PORT}/test`);
});