// ============================================================================
// PERSONA 5 PORTFOLIO - INTEGRAÇÃO SUPABASE (LOGIN DIRETO POR NOME + SENHA)
// ============================================================================

const SUPABASE_URL = "https://qndtechjmgjiweywoqxf.supabase.co";
const SUPABASE_KEY = "sb_publishable_FxF9VhNwEknJfQP1PCwUpw_cIMSsoav";

class P5SupabaseService {
  constructor() {
    this.client = null;
    this.username = null;
    this.password = null;
    this.initClient();
  }

  initClient() {
    if (window.supabase && typeof window.supabase.createClient === "function") {
      this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    try {
      const saved = sessionStorage.getItem("p5_sb_admin_creds");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.username && parsed.password) {
          this.username = parsed.username;
          this.password = parsed.password;
        }
      }
    } catch (e) {}
  }

  getDisplayName() {
    return (this.username || "ADMIN").toUpperCase();
  }

  // Verifica se o Admin está autenticado na sessão atual
  async checkAdminSession() {
    if (this.username && this.password) {
      return { username: this.username };
    }
    return null;
  }

  // Faz login verificando Nome + Senha direto na função criptografada do banco Supabase!
  async signIn(username, password) {
    const cleanUser = String(username || "").trim().toLowerCase();
    if (!cleanUser || !password) {
      throw new Error("Informe seu nome e senha.");
    }

    let isValid = false;

    if (this.client) {
      const { data, error } = await this.client.rpc("verify_admin_login", {
        p_username: cleanUser,
        p_password: password
      });
      if (error) throw new Error(error.message || "Erro ao verificar login no Supabase.");
      isValid = Boolean(data);
    } else {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_admin_login`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          p_username: cleanUser,
          p_password: password
        })
      });
      if (!res.ok) {
        throw new Error("Erro ao conectar ao banco. Verifique se rodou o SQL no Supabase.");
      }
      isValid = Boolean(await res.json());
    }

    if (!isValid) {
      throw new Error("Nome de usuário ou senha incorretos.");
    }

    this.username = cleanUser;
    this.password = password;
    try {
      sessionStorage.setItem(
        "p5_sb_admin_creds",
        JSON.stringify({ username: cleanUser, password })
      );
    } catch (e) {}

    return { username: cleanUser };
  }

  // Faz logout e bloqueia o Painel Editor novamente
  async signOut() {
    this.username = null;
    this.password = null;
    try {
      sessionStorage.removeItem("p5_sb_admin_creds");
    } catch (e) {}
  }

  // Carrega os dados do portfólio direto do banco Supabase quando qualquer visitante abre o site!
  async fetchPortfolioConfig() {
    try {
      if (this.client) {
        const { data, error } = await this.client
          .from("portfolio_config")
          .select("data")
          .eq("id", 1)
          .maybeSingle();

        if (!error && data && data.data) {
          return data.data;
        }
      } else {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/portfolio_config?id=eq.1&select=data`, {
          headers: {
            apikey: SUPABASE_KEY,
            Accept: "application/json"
          }
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows.length > 0 && rows[0].data) {
            return rows[0].data;
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch from Supabase (table may not be created yet):", e);
    }
    return null;
  }

  // Salva todo o objeto window.PORTFOLIO_DATA no Supabase validando Nome + Senha no servidor!
  async savePortfolioConfig(portfolioData) {
    if (!this.username || !this.password) {
      throw new Error("Você precisa estar logado como Admin para salvar na nuvem.");
    }

    if (this.client) {
      const { error } = await this.client.rpc("save_portfolio_with_login", {
        p_username: this.username,
        p_password: this.password,
        p_data: portfolioData
      });
      if (error) throw new Error(error.message);
      return true;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_portfolio_with_login`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        p_username: this.username,
        p_password: this.password,
        p_data: portfolioData
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || "Erro ao salvar no Supabase.");
    }
    return true;
  }
}

window.p5Supabase = new P5SupabaseService();
