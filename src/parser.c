#include "parser.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <math.h>

// İleri bildirimler (Recursive işlemleri için birbirlerini çağırmaları gerekiyor)
static float parse_expression(const char **s);
static float parse_term(const char **s);
static float parse_factor(const char **s);
static float parse_primary(const char **s);

// Boşlukları atlama fonksiyonu
static void skip_whitespace(const char **s) {
    while (**s == ' ' || **s == '\t') {
        (*s)++;
    }
}

// Ana fonksiyon: Dışarıdan çağrılan
float get_homogeneity_degree(const char *expr) {
    const char *ptr = expr;
    float degree = parse_expression(&ptr);
    return degree;
}

// 1. İfade (Expression): Toplama ve Çıkarma (+, -)
// A + B kuralı: d(A) = d(B) olmalıdır.
static float parse_expression(const char **s) {
    float deg1 = parse_term(s);
    if (deg1 == ERROR_NOT_HOMO) return ERROR_NOT_HOMO;

    skip_whitespace(s);
    while (**s == '+' || **s == '-') {
        (*s)++; // '+' veya '-' karakterini geç
        float deg2 = parse_term(s);
        if (deg2 == ERROR_NOT_HOMO) return ERROR_NOT_HOMO;
        
        // Homojenlik şartı: Toplanan/Çıkarılan terimlerin dereceleri AYNI olmalı!
        // Sabit sayılar (0 derece) veya 0.001 hata payı kontrolleri (float olduğu için)
        if (fabs(deg1 - deg2) > 0.001) {
            return ERROR_NOT_HOMO; // DERECE UYUŞMAZLIĞI -> HOMOJEN DEĞİL
        }
        skip_whitespace(s);
    }
    return deg1;
}

// 2. Terim (Term): Çarpma ve Bölme (*, /, veya gizli çarpma Örn: 2xy)
// A * B kuralı: d(A) + d(B)
// A / B kuralı: d(A) - d(B)
static float parse_term(const char **s) {
    float deg1 = parse_factor(s);
    if (deg1 == ERROR_NOT_HOMO) return ERROR_NOT_HOMO;

    skip_whitespace(s);
    while (1) {
        char op = **s;
        if (op == '*') {
            (*s)++;
            float deg2 = parse_factor(s);
            if (deg2 == ERROR_NOT_HOMO) return ERROR_NOT_HOMO;
            deg1 += deg2; // Çarpmada dereceler toplanır
        } 
        else if (op == '/') {
            (*s)++;
            float deg2 = parse_factor(s);
            if (deg2 == ERROR_NOT_HOMO) return ERROR_NOT_HOMO;
            deg1 -= deg2; // Bölmede dereceler çıkarılır
        }
        // Gizli çarpma kontrolü (Örn: "x y" veya "2x" veya "x(x+1)")
        else if (op == 'x' || op == 'y' || op == '(' || strncmp(*s, "sqrt", 4) == 0) {
            float deg2 = parse_factor(s);
            if (deg2 == ERROR_NOT_HOMO) return ERROR_NOT_HOMO;
            deg1 += deg2; // Gizli çarpmada da dereceler toplanır
        }
        else {
            break; // Term bitti
        }
        skip_whitespace(s);
    }
    return deg1;
}

// 3. Çarpan (Factor): Üs alma (^)
// A^n kuralı: d(A) * n
static float parse_factor(const char **s) {
    float deg1 = parse_primary(s);
    if (deg1 == ERROR_NOT_HOMO) return ERROR_NOT_HOMO;

    skip_whitespace(s);
    while (**s == '^') {
        (*s)++;
        // Üs değeri her zaman sabit bir sayı olmalıdır (diferansiyel denklem kuralları gereği)
        // O yüzden üs kısmını sadece sayı olarak okuyoruz
        skip_whitespace(s);
        
        // Üs sayı değerini okuyalım
        char *endptr;
        float power = strtof(*s, &endptr);
        if (endptr == *s) {
            // Eğer sayı okuyamadıysak (örneğin x^y gibi bir ifade varsa), bu bizim kapsamımızda değil
            return ERROR_NOT_HOMO;
        }
        *s = endptr; // İşaretçiyi sayının sonuna kaydır
        
        deg1 *= power; // Üs almada derece ile sayı çarpılır! (Örn: d(x) = 1, d(x^3) = 1*3 = 3)
        skip_whitespace(s);
    }
    return deg1;
}

// 4. Temel İfadeler (Primary): x, y, sayılar, parantez (), karekök sqrt()
static float parse_primary(const char **s) {
    skip_whitespace(s);
    
    // İşaret kontrolü (Unary eksi veya artı, Örn: -2xy)
    if (**s == '-' || **s == '+') {
        (*s)++;
        return parse_primary(s); // -x'in derecesi x'in derecesiyle aynıdır
    }

    // Karekök: sqrt(...)
    if (strncmp(*s, "sqrt", 4) == 0) {
        *s += 4; // "sqrt" kısmını geç
        skip_whitespace(s);
        if (**s == '(') {
            (*s)++;
            float deg = parse_expression(s);
            if (deg == ERROR_NOT_HOMO) return ERROR_NOT_HOMO;
            skip_whitespace(s);
            if (**s == ')') (*s)++; // Kapanış parantezini geç
            
            return deg / 2.0f; // KURAL: Karekök içindeki ifadenin derecesi 2'ye bölünür!
        }
    }
    
    // Parantez: (...)
    if (**s == '(') {
        (*s)++;
        float deg = parse_expression(s);
        if (deg == ERROR_NOT_HOMO) return ERROR_NOT_HOMO;
        skip_whitespace(s);
        if (**s == ')') (*s)++; // Kapanış parantezini geç
        return deg;
    }
    
    // Değişken x veya y
    if (**s == 'x' || **s == 'y') {
        (*s)++;
        return 1.0f; // x ve y'nin derecesi 1'dir.
    }
    
    // Sabit sayılar (Örn: 5, -3, 3.14)
    if (isdigit(**s) || **s == '.') {
        char *endptr;
        strtof(*s, &endptr);
        *s = endptr;
        return 0.0f; // Sabit sayıların derecesi her zaman 0'dır!
    }
    
    // Hatalı veya bilinmeyen karakter
    return ERROR_NOT_HOMO;
}
