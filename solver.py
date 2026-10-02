import sys
import json
from sympy import symbols, integrate, latex, sympify, Eq, solve, log, simplify

def solve_homogeneous(mode, M_str, N_str):
    x, y, v = symbols('x y v')
    
    try:
        from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor
        transformations = (standard_transformations + (implicit_multiplication_application, convert_xor))
        
        M = parse_expr(M_str, transformations=transformations)
        N = parse_expr(N_str, transformations=transformations)
        
        m_val = M.subs({x: 1, y: v})
        n_val = N.subs({x: 1, y: v})
        
        C = symbols('C')
        
        if mode == 'differential':
            # ln|x| + int N/(M + vN) dv = C
            fraction = n_val / (m_val + v * n_val)
            integral_res = integrate(fraction, v)
            final_eq_y = integral_res.subs(v, y/x)
            full_eq = Eq(log(x) + final_eq_y, C)
        else:
            # int 1 / ( (M/N) - v ) dv = ln|x| + C
            fraction = 1 / ((m_val / n_val) - v)
            fraction = simplify(fraction)
            integral_res = integrate(fraction, v)
            final_eq_y = integral_res.subs(v, y/x)
            # Yalniz birakirken C'nin pozitif kalmasi icin C'yi obur tarafa ekliyoruz:
            full_eq = Eq(final_eq_y, log(x) + C)
        
        try:
            # y'yi yalniz birakmayi dene
            y_solutions = solve(full_eq, y)
            if y_solutions and len(y_solutions) > 0:
                y_latex_list = [latex(sol) for sol in y_solutions]
                final_latex_str = " \\quad \\text{veya} \\quad ".join([f"y = {s}" for s in y_latex_list])
            else:
                if mode == 'differential':
                    final_latex_str = "\\ln|x| + \\left(" + latex(final_eq_y) + "\\right) = C \\quad \\text{(Kapali Form)}"
                else:
                    final_latex_str = "\\ln|x| + C = \\left(" + latex(final_eq_y) + "\\right) \\quad \\text{(Kapali Form)}"
        except Exception:
            if mode == 'differential':
                final_latex_str = "\\ln|x| + \\left(" + latex(final_eq_y) + "\\right) = C \\quad \\text{(Kapali Form)}"
            else:
                final_latex_str = "\\ln|x| + C = \\left(" + latex(final_eq_y) + "\\right) \\quad \\text{(Kapali Form)}"
        
        # Textbook gorunumu icin SymPy'nin log(x) ciktilarini ln|x|'e cevir:
        final_latex_str = final_latex_str.replace("\\log{\\left(x \\right)}", "\\ln|x|")
        final_latex_str = final_latex_str.replace("\\log", "\\ln")
        
        result = {
            "success": True,
            "integral_latex": latex(integral_res),
            "final_latex": final_latex_str
        }
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"success": False, "error": "Arguman eksik"}))
        sys.exit(1)
        
    mode_str = sys.argv[1]
    M_str = sys.argv[2]
    N_str = sys.argv[3]
    res = solve_homogeneous(mode_str, M_str, N_str)
    print(json.dumps(res))
