import http from 'k6/http';
import { check, group } from 'k6';
import { metrics } from '../common/metrics.js';

export const options = {
    stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
    ],
}

export default function () {
    group('Open quick pizza homepage', function () {
        const response = http.get('https://quickpizza.grafana.com/');
        check(response, {
            'is status 200': (r) => r.status === 200,
        });
        // checking with custom metrics
        metrics(response);
    })

    group('Order a pizza', function () {
        const url = 'https://quickpizza.grafana.com/api/pizza';
        const params = {
            headers: {
                'Content-Type': 'application/json',
            },
        };
        const payload = {
            customName: "",
            excludedIngredients: [],
            excludedTools: [],
            maxCaloriesPerSlice: 1000,
            maxNumberOfToppings: 5,
            minNumberOfToppings: 2,
            mustBeVegetarian: false
        };
        const response = http.post(url, JSON.stringify(payload), params);

        metrics(response);
    })
}