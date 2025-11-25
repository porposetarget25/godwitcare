package com.godwitcare.component;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class ApiNoCacheFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws java.io.IOException, ServletException {

        if (req.getRequestURI().startsWith("/api/")) {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
            res.setHeader("Pragma", "no-cache");
            res.setDateHeader("Expires", 0);
            // If you use cookies for auth, this helps intermediaries:
            res.setHeader("Vary", "Cookie, Authorization");
        }
        chain.doFilter(req, res);
    }
}

