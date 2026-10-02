#ifndef PARSER_H
#define PARSER_H

// Özel hata kodu (Homojen değilse bu değeri döndüreceğiz)
#define ERROR_NOT_HOMO -9999.0f

// Verilen matematiksel ifadenin homojenlik derecesini hesaplar.
// Eğer ifade homojen değilse ERROR_NOT_HOMO döndürür.
float get_homogeneity_degree(const char *expr);

#endif
