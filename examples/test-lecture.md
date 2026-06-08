# Introduction to Inheritance

Inheritance is one of the four pillars of object-oriented programming.

## What is Inheritance?

Inheritance allows a class to **inherit** properties and methods from another class. The class that inherits is called the **subclass** (or child class), and the class being inherited from is called the **superclass** (or parent class).

### Key Benefits

- Code reuse
- Establishes an "is-a" relationship
- Enables polymorphism

## Example in Java

Here's a simple example of inheritance in Java:

```java
public class Animal {
    protected String name;

    public Animal(String name) {
        this.name = name;
    }

    public void speak() {
        System.out.println("Some sound");
    }
}

public class Dog extends Animal {
    public Dog(String name) {
        super(name);
    }

    @Override
    public void speak() {
        System.out.println(name + " says: Woof!");
    }
}
```

## Important Terms

> **Superclass**: The parent class that provides the base functionality.
>
> **Subclass**: The child class that extends the superclass.
>
> **Override**: When a subclass provides its own implementation of a method defined in the superclass.

## Practice Exercise

1. Create a `Vehicle` class with properties like `brand` and `speed`
2. Create a `Car` class that extends `Vehicle`
3. Add a method `honk()` to the `Car` class
4. Test your classes in a `main` method

Good luck!
