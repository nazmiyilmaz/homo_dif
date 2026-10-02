#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "cJSON.h"
#include "parser.h"

// Basit bir string değiştirme (replace) fonksiyonu
char *str_replace(const char *orig, const char *rep, const char *with) {
    char *result; 
    char *ins; 
    char *tmp;    
    int len_rep;  
    int len_with; 
    int len_front;
    int count;    

    if (!orig || !rep) return NULL;
    len_rep = strlen(rep);
    if (len_rep == 0) return NULL;
    if (!with) with = "";
    len_with = strlen(with);

    ins = (char *)orig;
    for (count = 0; (tmp = strstr(ins, rep)); ++count) {
        ins = tmp + len_rep;
    }

    tmp = result = malloc(strlen(orig) + (len_with - len_rep) * count + 1);
    if (!result) return NULL;

    while (count--) {
        ins = strstr(orig, rep);
        len_front = ins - orig;
        tmp = strncpy(tmp, orig, len_front) + len_front;
        tmp = strcpy(tmp, with) + len_with;
        orig += len_front + len_rep; 
    }
    strcpy(tmp, orig);
    return result;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("{\"success\": false, \"message\": \"Girdi argumani eksik!\"}\n");
        return 1;
    }

    const char *json_input = argv[1];
    cJSON *parsed_json = cJSON_Parse(json_input);
    if (parsed_json == NULL) {
        printf("{\"success\": false, \"message\": \"C Motoru: JSON ayristirma hatasi!\"}\n");
        return 1;
    }

    cJSON *mode_item = cJSON_GetObjectItemCaseSensitive(parsed_json, "mode");
    cJSON *m_item = cJSON_GetObjectItemCaseSensitive(parsed_json, "M");
    cJSON *n_item = cJSON_GetObjectItemCaseSensitive(parsed_json, "N");
    cJSON *p_item = cJSON_GetObjectItemCaseSensitive(parsed_json, "P");
    cJSON *q_item = cJSON_GetObjectItemCaseSensitive(parsed_json, "Q");
    
    cJSON *m_ascii_item = cJSON_GetObjectItemCaseSensitive(parsed_json, "M_ascii");
    cJSON *n_ascii_item = cJSON_GetObjectItemCaseSensitive(parsed_json, "N_ascii");
    cJSON *p_ascii_item = cJSON_GetObjectItemCaseSensitive(parsed_json, "P_ascii");
    cJSON *q_ascii_item = cJSON_GetObjectItemCaseSensitive(parsed_json, "Q_ascii");

    const char *mode = cJSON_IsString(mode_item) ? mode_item->valuestring : "";
    const char *m_str = "";
    const char *n_str = "";
    const char *m_ascii = "";
    const char *n_ascii = "";
    
    if (strcmp(mode, "differential") == 0) {
        m_str = cJSON_IsString(m_item) ? m_item->valuestring : "";
        n_str = cJSON_IsString(n_item) ? n_item->valuestring : "";
        m_ascii = cJSON_IsString(m_ascii_item) ? m_ascii_item->valuestring : "";
        n_ascii = cJSON_IsString(n_ascii_item) ? n_ascii_item->valuestring : "";
    } else {
        m_str = cJSON_IsString(p_item) ? p_item->valuestring : "";
        n_str = cJSON_IsString(q_item) ? q_item->valuestring : "";
        m_ascii = cJSON_IsString(p_ascii_item) ? p_ascii_item->valuestring : "";
        n_ascii = cJSON_IsString(q_ascii_item) ? q_ascii_item->valuestring : "";
    }

    float m_deg = get_homogeneity_degree(m_ascii);
    float n_deg = get_homogeneity_degree(n_ascii);
    
    int is_homo = 0;
    float final_deg = 0.0f;
    
    if (m_deg != ERROR_NOT_HOMO && n_deg != ERROR_NOT_HOMO) {
        if (fabs(m_deg - n_deg) < 0.001f) {
            is_homo = 1;
            final_deg = m_deg;
        }
    }

    cJSON *response_json = cJSON_CreateObject();
    cJSON_AddBoolToObject(response_json, "success", 1);
    cJSON_AddBoolToObject(response_json, "isFirstOrder", 1);
    cJSON_AddBoolToObject(response_json, "isHomogeneous", is_homo);
    
    if (is_homo) {
        cJSON_AddNumberToObject(response_json, "degree", final_deg);
        cJSON_AddStringToObject(response_json, "equationLatex", mode[0] == 'd' ? "M(x,y)dx + N(x,y)dy = 0" : "dy/dx = P/Q");
        
        cJSON *steps = cJSON_CreateArray();
        cJSON_AddItemToObject(response_json, "steps", steps);
        
        // 1. ADIM
        cJSON *step1 = cJSON_CreateObject();
        cJSON_AddStringToObject(step1, "title", "1. Homojenlik Testi (Derece Analizi)");
        char desc1[256];
        sprintf(desc1, "M(x,y) ve N(x,y) fonksiyonlarinin homojenlik dereceleri incelenir. (Ortak derece: k = %.1f)", final_deg);
        cJSON_AddStringToObject(step1, "description", desc1);
        char latex1[256];
        sprintf(latex1, "M(tx, ty) = t^{%.1f} M(x,y) \\implies k = %.1f", final_deg, final_deg);
        cJSON_AddStringToObject(step1, "latex", latex1);
        cJSON_AddItemToArray(steps, step1);

        // 2. ADIM
        cJSON *step2 = cJSON_CreateObject();
        cJSON_AddStringToObject(step2, "title", "2. Standart Degisken Donusumu");
        cJSON_AddStringToObject(step2, "description", "Denklemi ayrilabilir forma getirmek icin y = vx donusumu uygulanir:");
        cJSON_AddStringToObject(step2, "latex", "y = v \\cdot x \\implies dy = v\\,dx + x\\,dv");
        cJSON_AddItemToArray(steps, step2);

        // 3. ADIM (DİNAMİK YERİNE KOYMA)
        cJSON *step3 = cJSON_CreateObject();
        cJSON_AddStringToObject(step3, "title", "3. Donusumun Denkleme Uygulanmasi");
        cJSON_AddStringToObject(step3, "description", "y ve dy ifadeleri orijinal diferansiyel denklemde yerine yazilir:");
        
        char *m_sub = str_replace(m_str, "y", "(vx)");
        char *n_sub = str_replace(n_str, "y", "(vx)");
        
        char latex3[1024];
        if (strcmp(mode, "differential") == 0) {
            sprintf(latex3, "[%s] dx + [%s] (v\\,dx + x\\,dv) = 0", m_sub ? m_sub : m_str, n_sub ? n_sub : n_str);
        } else {
            sprintf(latex3, "v + x\\frac{dv}{dx} = \\frac{%s}{%s}", m_sub ? m_sub : m_str, n_sub ? n_sub : n_str);
        }
        cJSON_AddStringToObject(step3, "latex", latex3);
        cJSON_AddItemToArray(steps, step3);

        // 4. ADIM (DİNAMİK DEĞİŞKENLERİNE AYIRMA FORMU)
        cJSON *step4 = cJSON_CreateObject();
        cJSON_AddStringToObject(step4, "title", "4. Degiskenlerine Ayirma (Separable Form)");
        cJSON_AddStringToObject(step4, "description", "x^k ortak carpani sadelestirilir ve denklem x ile v degiskenlerine gore gruplanir:");
        
        // x->(1) ve y->v yerlestirmesi
        char *m1 = str_replace(m_str, "x", "(1)");
        char *m_1v = str_replace(m1 ? m1 : m_str, "y", "v");
        
        char *n1 = str_replace(n_str, "x", "(1)");
        char *n_1v = str_replace(n1 ? n1 : n_str, "y", "v");
        
        char latex4[1024];
        if (strcmp(mode, "differential") == 0) {
            sprintf(latex4, "\\frac{dx}{x} + \\frac{%s}{[%s] + v \\cdot [%s]} dv = 0", 
                    n_1v ? n_1v : n_str, m_1v ? m_1v : m_str, n_1v ? n_1v : n_str);
        } else {
            sprintf(latex4, "\\frac{dx}{x} = \\frac{dv}{ \\frac{%s}{%s} - v }", 
                    m_1v ? m_1v : m_str, n_1v ? n_1v : n_str);
        }
        cJSON_AddStringToObject(step4, "latex", latex4);
        cJSON_AddItemToArray(steps, step4);

        // 5. ADIM (İNTEGRAL AŞAMASI)
        cJSON *step5 = cJSON_CreateObject();
        cJSON_AddStringToObject(step5, "title", "5. Integral ve Genel Cozumun Kurulumu");
        cJSON_AddStringToObject(step5, "description", "Denklemin iki tarafinin integrali alinarak analitik cozum formu olusturulur.");
        char latex5[1024];
        if (strcmp(mode, "differential") == 0) {
            sprintf(latex5, "\\ln|x| + \\int \\frac{%s}{[%s] + v [%s]} dv = C", 
                    n_1v ? n_1v : n_str, m_1v ? m_1v : m_str, n_1v ? n_1v : n_str);
        } else {
             sprintf(latex5, "\\ln|x| = \\int \\frac{dv}{ \\frac{%s}{%s} - v } + C", 
                    m_1v ? m_1v : m_str, n_1v ? n_1v : n_str);
        }
        cJSON_AddStringToObject(step5, "latex", latex5);
        cJSON_AddItemToArray(steps, step5);

        // Bellek Temizligi
        if(m_sub) free(m_sub);
        if(n_sub) free(n_sub);
        if(m1) free(m1);
        if(m_1v) free(m_1v);
        if(n1) free(n1);
        if(n_1v) free(n_1v);
    } else {
        cJSON_AddStringToObject(response_json, "reason", "Derece Cebiri Algoritmasi (C Motoru) farkli dereceler buldu veya gecersiz bir metinle karsilasti.");
    }

    char *json_output = cJSON_PrintUnformatted(response_json);
    printf("%s\n", json_output);

    cJSON_Delete(parsed_json);
    cJSON_Delete(response_json);
    free(json_output);

    return 0;
}
