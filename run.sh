sudo systemctl start docker
sudo docker-compose down

cd frontend/
rm -rf dist node_modules
echo
echo "=========== 1/4 - Скачивание модулей ==========="
echo0
npm i 
echo
echo "=========== 2/4 - Создание билда ==========="
echo
npm run build

cd ../
echo
echo "=========== 3/3 - Запуск контейнера ==========="
echo
sudo docker-compose up --build -d 

echo
echo
echo "=========== Не забудьте скачать модели: sudo docker-compose exec ollama ollama pull (Название модели) ==========="
