FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy dashboard static index containing the React application
COPY index.html /usr/share/nginx/html/index.html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
