'use strict';

 /*
 * DATA MODUL
 **************************************************************/
const budgetData = (function() {

    // Data structure. Use localstorage data if exists
    let data = {
        items: {
            exp: JSON.parse(localStorage.getItem('exp')) || [],
            inc: JSON.parse(localStorage.getItem('inc')) || []
        },
        totalBudget: JSON.parse(localStorage.getItem('totalBudget')) || 0,
        totals: {
            exp: JSON.parse(localStorage.getItem('totalExp')) || 0,
            inc: JSON.parse(localStorage.getItem('totalInc')) || 0,
        }
    };

    // Constructor function for creating objects
    const Item = function(id, text, amount) {
        this.id = id;
        this.text = text;
        this.amount = amount;
    }

    return {
        addNewItem: function(type, text, amount) {
            // Create an ID for the item object. If there is no element in the array the id is 0, in other cases find the biggest id and add 1
            const id = data.items[type].length === 0 ? 0 : Math.max(...data.items[type].map( cur => cur.id )) + 1;

            // Create item object
            let obj = new Item(id, text, amount);

            // Add the new object to either exp array or inc array. It depends on the type.
            data.items[type].push(obj);

            // Add updated items array to localstorage
            const items = data.items[type];
            localStorage.setItem(type, JSON.stringify(items));

            return id;
        },
        getItems: function(type) {
            return data.items[type];
        },
        updateBudgetData: function(type, amount) {
            data.totals[type] += amount;
            data.totalBudget = data.totals.inc - data.totals.exp;

            // Update totals in localstorage
            const total = data.totals[type];
            const totalBudget = data.totalBudget;

            const totaltype = type === 'inc' ? 'totalInc' : 'totalExp';

            localStorage.setItem(totaltype, JSON.stringify(total));
            localStorage.setItem('totalBudget', JSON.stringify(totalBudget));
        },
        getTotals: function() {
            return {
                totalBudget: data.totalBudget,
                totalExpenses: data.totals.exp,
                totalIncomes: data.totals.inc
            }
        },
        deleteItemData: function(type, id) {
            // Let's find the object in the array we want to delete
            const obj = data.items[type].find( cur => cur.id === id );
            // Update budget data. We give negative amount to reduce totals
            this.updateBudgetData(type, -obj.amount);
            // Let's find the index of the item in the array we want to delete
            const index = data.items[type].findIndex( cur => cur.id === id );
            // Delete it from the array
            if ( index !== -1 ) data.items[type].splice(index, 1);

            // Add updated items array to localstorage
            const items = data.items[type];
            localStorage.setItem(type, JSON.stringify(items));
        },
        sortItemsData: function(type, dir) {
            let sortedList;
            // Check the direction of sorting
            if( dir === 'desc' ) {
                sortedList = data.items[type].sort( (a, b) => a.amount > b.amount ? -1 : 1 );
            } else if( dir === 'asc' ) {
                sortedList = data.items[type].sort( (a, b) => a.amount > b.amount ? 1 : -1 );
            }
            return sortedList;
        }
    }
})();

 /*
 * UI MODUL
**************************************************************/
const budgetUI = (function() {

    function DOMStrings() {
        return {
            totalBudget: '#total-budget',
            totalExpenses: '#total-expenses',
            totalIncomes: '#total-incomes',
            budgetForm: '#budget-form',
            textField: 'input[name="text"]',
            listsWrapper: '.lists-wrapper',
            sortList: '.sort',
            expList: '#exp-list',
            incList: '#inc-list',
            deleteThis: '.delete-this'
        }
    }
    // Use Internationalization API for formatting the amounts. Browser support: https://caniuse.com/#feat=internationalization
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    });

    return {
        DOMStrings,
        addItemUI: function(type, id, text, amount) {

            document.querySelector(`#${type}-list`)
                            .insertAdjacentHTML('beforeend',
                            `<li>
                                ${text} <span>${formatter.format(amount)} <a class="delete-this" id="${type}-${id}">&#10006;</a></span>
                            </li>`);
        },
        updateBudgetUI: function(totalBudget, totalExp, totalInc) {
            document.querySelector(DOMStrings().totalBudget).innerHTML = formatter.format(totalBudget);
            document.querySelector(DOMStrings().totalExpenses).innerHTML = formatter.format(totalExp);
            document.querySelector(DOMStrings().totalIncomes).innerHTML = formatter.format(totalInc);
        },
        deleteItemUI: function(el) {
            el.closest('li').remove();
        },
        displayListUI: function(type, arr) {
            const html = arr.map(cur => {
                return `
                    <li>
                        ${cur.text} <span>${formatter.format(cur.amount)} <a class="delete-this" id="${type}-${cur.id}">&#10006;</a></span>
                    </li>`;
            }).join('');

             // Check the direction of sorting and insert the list
            const list = type === 'inc' ? DOMStrings().incList : DOMStrings().expList;
            document.querySelector(list).innerHTML = html;
        }
    }
})();

 /*
 * CONTROLLER MODUL
**************************************************************/
const controller = (function(budgetData, budgetUI) {

    function setupEventListeners() {
        document.querySelector(budgetUI.DOMStrings().budgetForm).addEventListener('submit', addItem);
        // We listen to the #list-wrapper DOM element, using event bubbling to catch delete and sort event
        document.querySelector(budgetUI.DOMStrings().listsWrapper).addEventListener('click', deleteItem);
        document.querySelector(budgetUI.DOMStrings().listsWrapper).addEventListener('click', sortItems);
    }

    function addItem(event) {
        event.preventDefault();
        // Input cannot be empty and amount must be positive number
        if ( event.target.elements['text'].value === ''
            || event.target.elements['amount'].value === ''
            || event.target.elements['amount'].value < 0 ) return;

        const type = event.target.elements['type'].value;
        const text = event.target.elements['text'].value;
        const amount = parseFloat(event.target.elements['amount'].value);

        // Add new item to the data structure and get back the id of the new element
        const id = budgetData.addNewItem(type, text, amount);
        // Add new item to the UI
        budgetUI.addItemUI(type, id, text, amount);
        updateBudget(type, amount);

        // Clear form but keep the state of the select box
        this.elements['text'].value = '';
        this.elements['amount'].value = '';

        // Jump to the text input field
        document.querySelector(budgetUI.DOMStrings().textField).focus();
    }

    function deleteItem(event) {

        // Go further only if '.delete-this' button was clicked
        if( !event.target.classList.contains('delete-this') ) return;

        // Split id. It looks something like 'inc-0'
        const arrDel = event.target.id.split('-');

        budgetData.deleteItemData(arrDel[0], parseInt(arrDel[1]));
        budgetUI.deleteItemUI(event.target);

        const totalBudget = budgetData.getTotals().totalBudget;
        const totalExp = budgetData.getTotals().totalExpenses;
        const totalInc = budgetData.getTotals().totalIncomes;

        budgetUI.updateBudgetUI(totalBudget, totalExp, totalInc);
    }

    function updateBudget(type, amount) {
        budgetData.updateBudgetData(type, amount);

        const totalBudget = budgetData.getTotals().totalBudget;
        const totalExp = budgetData.getTotals().totalExpenses;
        const totalInc = budgetData.getTotals().totalIncomes;

        budgetUI.updateBudgetUI(totalBudget, totalExp, totalInc);
    }

    function sortItems() {
        // Go further only if one of the '.sort' buttons was clicked
        if( !event.target.classList.contains('sort') ) return;

        // Split data-sort attribute. It looks something like 'inc-asc' or 'exp-desc' etc.
        const arrSort = event.target.dataset.sort.split('-');

        const sortedList = budgetData.sortItemsData(arrSort[0], arrSort[1]);
        budgetUI.displayListUI(arrSort[0], sortedList);
    }

    // Use localstorage data if exists
    function checkLocalStorage() {
        const storedInc = budgetData.getItems('inc');
        const storedExp = budgetData.getItems('exp');;

        if ( storedInc.length > 0 ) {
            budgetUI.displayListUI('inc', storedInc);
        }

        if ( storedExp.length > 0 ) {
            budgetUI.displayListUI('exp', storedExp);
        }

        const totalBudget = budgetData.getTotals().totalBudget;
        const totalExp = budgetData.getTotals().totalExpenses;
        const totalInc = budgetData.getTotals().totalIncomes;

        budgetUI.updateBudgetUI(totalBudget, totalExp, totalInc);
    }

    return {
        init: function() {
            setupEventListeners();
            checkLocalStorage();
        }
    }

})(budgetData, budgetUI);

controller.init();
